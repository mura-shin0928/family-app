import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

describe("life_events / life_event_procedures RLS", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberCId: string;
  let eventF1: string;
  let eventF2: string;
  let itemF1: string;
  let itemF2: string;
  let childF1: string;
  let childF2: string;

  const userA = { email: `le-a-${runId}@example.test` };
  const userC = { email: `le-c-${runId}@example.test` };
  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `LifeEventsF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `LifeEventsF2-${runId}` })
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

    const { data: events, error: eventsError } = await admin
      .from("life_events")
      .insert([
        {
          family_id: familyF1,
          kind: "birth",
          title: "妊娠・出産",
          child_id: childF1,
          created_by: memberAId,
        },
        {
          family_id: familyF2,
          kind: "birth",
          title: "妊娠・出産",
          child_id: childF2,
          created_by: memberCId,
        },
      ])
      .select("id, family_id");
    if (eventsError || !events)
      throw new Error(`failed to seed life_events: ${eventsError?.message}`);
    const findEventId = (familyId: string): string => {
      const event = events.find((e) => e.family_id === familyId);
      if (!event) throw new Error(`seeded life_event missing for ${familyId}`);
      return event.id;
    };
    eventF1 = findEventId(familyF1);
    eventF2 = findEventId(familyF2);

    const { data: items, error: itemsError } = await admin
      .from("life_event_procedures")
      .insert([
        {
          family_id: familyF1,
          life_event_id: eventF1,
          sort_order: 1,
          title: "出生届を出す",
          decided_by: "government",
          timing_kind: "deadline",
          anchor_event: "birth",
          offset_days: 13,
          category: "birth_registration",
        },
        {
          family_id: familyF2,
          life_event_id: eventF2,
          sort_order: 1,
          title: "出生届を出す",
          decided_by: "government",
          timing_kind: "deadline",
        },
      ])
      .select("id, family_id");
    if (itemsError || !items)
      throw new Error(
        `failed to seed life_event_procedures: ${itemsError?.message}`,
      );
    const findItemId = (familyId: string): string => {
      const item = items.find((i) => i.family_id === familyId);
      if (!item) throw new Error(`seeded item missing for ${familyId}`);
      return item.id;
    };
    itemF1 = findItemId(familyF1);
    itemF2 = findItemId(familyF2);
  });

  afterAll(async () => {
    await admin
      .from("life_event_procedures")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await admin
      .from("life_events")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await admin.from("children").delete().in("family_id", [familyF1, familyF2]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  describe("life_events", () => {
    it("a member can select their own family's events but not another family's", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: own, error: ownError } = await clientA
        .from("life_events")
        .select("id")
        .eq("id", eventF1);
      expect(ownError).toBeNull();
      expect(own?.map((e) => e.id)).toContain(eventF1);

      const { data: other, error: otherError } = await clientA
        .from("life_events")
        .select("id")
        .eq("id", eventF2);
      expect(otherError).toBeNull();
      expect(other).toHaveLength(0);
    });

    it("a member can add an event to their own family and soft-delete it", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: created, error: createError } = await clientA
        .from("life_events")
        .insert({
          family_id: familyF1,
          kind: "nursery",
          title: "保育園入園",
          child_id: childF1,
          created_by: memberAId,
        })
        .select("id")
        .single();
      expect(createError).toBeNull();
      expect(created?.id).toBeTruthy();

      const { error: deleteError } = await clientA
        .from("life_events")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", created?.id ?? "");
      expect(deleteError).toBeNull();

      await admin
        .from("life_events")
        .delete()
        .eq("id", created?.id ?? "");
    });

    it("a family can hold two events of the same kind (second child etc.)", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("life_events")
        .insert({
          family_id: familyF1,
          kind: "birth",
          title: "第2子の出産",
          created_by: memberAId,
        })
        .select("id")
        .single();
      expect(error).toBeNull();

      await admin
        .from("life_events")
        .delete()
        .eq("id", data?.id ?? "");
    });

    it("cannot add an event to another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("life_events").insert({
        family_id: familyF2,
        kind: "birth",
        title: "なりすまし",
        created_by: memberAId,
      });
      expect(error).not.toBeNull();
    });

    it("cannot add an event pointing at another family's child", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("life_events").insert({
        family_id: familyF1,
        kind: "birth",
        title: "他家族の子",
        child_id: childF2,
        created_by: memberAId,
      });
      expect(error).not.toBeNull();
    });

    it("cannot add an event with created_by from another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("life_events").insert({
        family_id: familyF1,
        kind: "birth",
        title: "他家族のメンバー",
        created_by: memberCId,
      });
      expect(error).not.toBeNull();
    });
  });

  describe("life_event_procedures", () => {
    it("a member can select their own family's items only", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: own } = await clientA
        .from("life_event_procedures")
        .select("id")
        .eq("id", itemF1);
      expect(own?.map((i) => i.id)).toContain(itemF1);

      const { data: other, error: otherError } = await clientA
        .from("life_event_procedures")
        .select("id")
        .eq("id", itemF2);
      expect(otherError).toBeNull();
      expect(other).toHaveLength(0);
    });

    it("a member can add, edit, reorder and soft-delete items of their own family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: created, error: createError } = await clientA
        .from("life_event_procedures")
        .insert({
          family_id: familyF1,
          life_event_id: eventF1,
          sort_order: 2,
          title: "追加した項目",
          decided_by: "family",
          timing_kind: "around",
        })
        .select("id")
        .single();
      expect(createError).toBeNull();

      const { error: updateError } = await clientA
        .from("life_event_procedures")
        .update({ title: "書き換えた項目", sort_order: 1 })
        .eq("id", created?.id ?? "");
      expect(updateError).toBeNull();

      const { error: deleteError } = await clientA
        .from("life_event_procedures")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", created?.id ?? "");
      expect(deleteError).toBeNull();

      await admin
        .from("life_event_procedures")
        .delete()
        .eq("id", created?.id ?? "");
    });

    it("cannot add an item under another family's life event", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("life_event_procedures").insert({
        family_id: familyF1,
        life_event_id: eventF2,
        sort_order: 1,
        title: "なりすまし項目",
        decided_by: "family",
        timing_kind: "around",
      });
      expect(error).not.toBeNull();
    });

    it("cannot add an item with family_id spoofed to another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("life_event_procedures").insert({
        family_id: familyF2,
        life_event_id: eventF2,
        sort_order: 1,
        title: "なりすまし項目",
        decided_by: "family",
        timing_kind: "around",
      });
      expect(error).not.toBeNull();
    });

    it("rejects an unknown decided_by / timing_kind", async () => {
      const { error: decidedByError } = await admin
        .from("life_event_procedures")
        .insert({
          family_id: familyF1,
          life_event_id: eventF1,
          sort_order: 99,
          title: "不正な分類",
          decided_by: "shrine",
          timing_kind: "around",
        });
      expect(decidedByError).not.toBeNull();

      const { error: timingError } = await admin
        .from("life_event_procedures")
        .insert({
          family_id: familyF1,
          life_event_id: eventF1,
          sort_order: 99,
          title: "不正な時期",
          decided_by: "tradition",
          timing_kind: "someday",
        });
      expect(timingError).not.toBeNull();
    });
  });
});
