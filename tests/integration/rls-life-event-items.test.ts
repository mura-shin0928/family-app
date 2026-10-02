import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

describe("life_event_items RLS / tasks との同期トリガー", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberCId: string;
  let childF1: string;
  let childF2: string;
  let itemF2: string;

  const userA = { email: `lei-a-${runId}@example.test` };
  const userC = { email: `lei-c-${runId}@example.test` };
  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `LifeEventItemsF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `LifeEventItemsF2-${runId}` })
      .select("id")
      .single();
    if (f2Error || !f2)
      throw new Error(`failed to create F2: ${f2Error?.message}`);
    familyF2 = f2.id;

    const created = await Promise.all([
      createConfirmedUser(admin, userA.email, PASSWORD),
      createConfirmedUser(admin, userC.email, PASSWORD),
    ]);
    for (const u of created) userIds[u.email] = u.id;

    const { data: members, error: membersError } = await admin
      .from("family_members")
      .insert([
        {
          family_id: familyF1,
          user_id: userIds[userA.email],
          display_name: "A",
        },
        {
          family_id: familyF2,
          user_id: userIds[userC.email],
          display_name: "C",
        },
      ])
      .select("id, user_id");
    if (membersError || !members)
      throw new Error(
        `failed to seed family_members: ${membersError?.message}`,
      );
    const findMemberId = (userId: string): string => {
      const member = members.find((m) => m.user_id === userId);
      if (!member)
        throw new Error(`seeded family_members row missing for ${userId}`);
      return member.id;
    };
    memberAId = findMemberId(userIds[userA.email]);
    memberCId = findMemberId(userIds[userC.email]);

    const { data: children, error: childrenError } = await admin
      .from("children")
      .insert([
        {
          family_id: familyF1,
          display_name: "長女",
          birth_date: "2026-08-01",
          created_by: memberAId,
        },
        {
          family_id: familyF2,
          display_name: "長男",
          birth_date: "2026-08-01",
          created_by: memberCId,
        },
      ])
      .select("id, family_id");
    if (childrenError || !children)
      throw new Error(`failed to seed children: ${childrenError?.message}`);
    const findChildId = (familyId: string): string => {
      const child = children.find((c) => c.family_id === familyId);
      if (!child) throw new Error(`seeded child missing for ${familyId}`);
      return child.id;
    };
    childF1 = findChildId(familyF1);
    childF2 = findChildId(familyF2);

    const { data: f2Item, error: f2ItemError } = await admin
      .from("life_event_items")
      .insert({
        family_id: familyF2,
        child_id: childF2,
        catalog_key: "birth:birth-registration",
        title: "出生届を出す",
        status: "in_task",
        created_by: memberCId,
      })
      .select("id")
      .single();
    if (f2ItemError || !f2Item)
      throw new Error(`failed to seed F2 item: ${f2ItemError?.message}`);
    itemF2 = f2Item.id;
  });

  afterAll(async () => {
    const families = [familyF1, familyF2];
    await admin.from("tasks").delete().in("family_id", families);
    await admin.from("life_event_items").delete().in("family_id", families);
    await admin.from("children").delete().in("family_id", families);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", families);
  });

  async function insertItem(
    client: SupabaseClient,
    fields: { catalogKey: string | null; status?: "in_task" | "done" },
  ) {
    return client
      .from("life_event_items")
      .insert({
        family_id: familyF1,
        child_id: childF1,
        catalog_key: fields.catalogKey,
        title: "テストの項目",
        status: fields.status ?? "in_task",
        done_on: fields.status === "done" ? "2026-09-01" : null,
        created_by: memberAId,
      })
      .select("id")
      .single();
  }

  /** A としてタスクと、それが参照する項目を作る。 */
  async function seedLinkedTask(
    clientA: SupabaseClient,
    itemStatus: "in_task" | "done" = "in_task",
  ): Promise<{ taskId: string; itemId: string }> {
    const { data: item, error: itemError } = await insertItem(clientA, {
      catalogKey: null,
      status: itemStatus,
    });
    if (itemError || !item)
      throw new Error(`failed to seed item: ${itemError?.message}`);

    const { data: task, error: taskError } = await clientA
      .from("tasks")
      .insert({
        family_id: familyF1,
        title: "テストの項目",
        sort_order: 1,
        created_by: memberAId,
        life_event_item_id: item.id,
      })
      .select("id")
      .single();
    if (taskError || !task)
      throw new Error(`failed to seed task: ${taskError?.message}`);
    return { taskId: task.id, itemId: item.id };
  }

  async function readItem(itemId: string) {
    const { data, error } = await admin
      .from("life_event_items")
      .select("status, done_on, deleted_at")
      .eq("id", itemId)
      .single();
    if (error || !data)
      throw new Error(`failed to read item: ${error?.message}`);
    return data;
  }

  describe("RLS", () => {
    it("another family's member sees 0 rows", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { data, error } = await clientA
        .from("life_event_items")
        .select("id")
        .eq("id", itemF2);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("cannot insert into another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { error } = await clientA.from("life_event_items").insert({
        family_id: familyF2,
        child_id: childF2,
        title: "なりすまし項目",
        status: "in_task",
        created_by: memberAId,
      });
      expect(error).not.toBeNull();
    });

    it("cannot insert with another family's child", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { error } = await clientA.from("life_event_items").insert({
        family_id: familyF1,
        child_id: childF2,
        title: "他家族の子の項目",
        status: "in_task",
        created_by: memberAId,
      });
      expect(error).not.toBeNull();
    });

    it("cannot insert with created_by from another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { error } = await clientA.from("life_event_items").insert({
        family_id: familyF1,
        child_id: childF1,
        title: "なりすまし項目",
        status: "in_task",
        created_by: memberCId,
      });
      expect(error).not.toBeNull();
    });
  });

  describe("partial unique (child_id, catalog_key)", () => {
    it("rejects a second live row with 23505, and allows one after soft delete", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const catalogKey = `birth:unique-${runId}`;

      const first = await insertItem(clientA, { catalogKey });
      expect(first.error).toBeNull();

      const second = await insertItem(clientA, { catalogKey });
      expect(second.error?.code).toBe("23505");

      const { error: deleteError } = await clientA
        .from("life_event_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", first.data?.id ?? "");
      expect(deleteError).toBeNull();

      const third = await insertItem(clientA, { catalogKey });
      expect(third.error).toBeNull();
    });

    it("allows several rows without catalog_key", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const first = await insertItem(clientA, { catalogKey: null });
      const second = await insertItem(clientA, { catalogKey: null });
      expect(first.error).toBeNull();
      expect(second.error).toBeNull();
    });
  });

  describe("sync trigger on tasks", () => {
    it("completing the task marks the item done on the JST date", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { taskId, itemId } = await seedLinkedTask(clientA);

      const { error } = await clientA
        .from("tasks")
        .update({
          status: "done",
          completed_at: "2026-10-01T15:30:00Z",
          completed_by: memberAId,
        })
        .eq("id", taskId);
      expect(error).toBeNull();

      const item = await readItem(itemId);
      expect(item.status).toBe("done");
      expect(item.done_on).toBe("2026-10-02");
    });

    it("reopening the task puts the item back to in_task", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { taskId, itemId } = await seedLinkedTask(clientA);

      await clientA
        .from("tasks")
        .update({
          status: "done",
          completed_at: "2026-10-01T15:30:00Z",
          completed_by: memberAId,
        })
        .eq("id", taskId);
      const { error } = await clientA
        .from("tasks")
        .update({ status: "open", completed_at: null, completed_by: null })
        .eq("id", taskId);
      expect(error).toBeNull();

      const item = await readItem(itemId);
      expect(item.status).toBe("in_task");
      expect(item.done_on).toBeNull();
    });

    it("deleting the task soft-deletes an in_task item", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { taskId, itemId } = await seedLinkedTask(clientA);

      const { error } = await clientA
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", taskId);
      expect(error).toBeNull();

      const item = await readItem(itemId);
      expect(item.deleted_at).not.toBeNull();
    });

    it("deleting the task leaves a done item as is", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { taskId, itemId } = await seedLinkedTask(clientA, "done");

      const { error } = await clientA
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", taskId);
      expect(error).toBeNull();

      const item = await readItem(itemId);
      expect(item.status).toBe("done");
      expect(item.done_on).toBe("2026-09-01");
      expect(item.deleted_at).toBeNull();
    });

    it("a task without life_event_item_id changes no item", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { itemId } = await seedLinkedTask(clientA);

      const { data: task, error: taskError } = await clientA
        .from("tasks")
        .insert({
          family_id: familyF1,
          title: "テストの項目",
          sort_order: 2,
          created_by: memberAId,
        })
        .select("id")
        .single();
      expect(taskError).toBeNull();

      const { error } = await clientA
        .from("tasks")
        .update({
          status: "done",
          completed_at: "2026-10-01T15:30:00Z",
          completed_by: memberAId,
        })
        .eq("id", task?.id ?? "");
      expect(error).toBeNull();

      const item = await readItem(itemId);
      expect(item.status).toBe("in_task");
      expect(item.done_on).toBeNull();
      expect(item.deleted_at).toBeNull();
    });
  });
});
