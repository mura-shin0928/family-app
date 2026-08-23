import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

describe("procedure_templates / procedure_template_items / family_procedures RLS (P1再設計)", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberCId: string;
  let templateF1: string;
  let itemF1: string;
  let templateF2: string;
  let itemF2: string;
  let childF1: string;

  const userA = { email: `pt-a-${runId}@example.test` };
  const userC = { email: `pt-c-${runId}@example.test` };
  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `TemplatesF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `TemplatesF2-${runId}` })
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

    const { data: t1, error: t1Error } = await admin
      .from("procedure_templates")
      .insert({
        family_id: familyF1,
        life_event_kind: "birth",
        title: "出産でやること",
        created_by: memberAId,
      })
      .select("id")
      .single();
    if (t1Error || !t1)
      throw new Error(`failed to seed F1 template: ${t1Error?.message}`);
    templateF1 = t1.id;

    const { data: i1, error: i1Error } = await admin
      .from("procedure_template_items")
      .insert({
        template_id: templateF1,
        sort_order: 1,
        title: "出生届を出す",
        category: "birth_registration",
        anchor_event: "birth",
        offset_days: 13,
      })
      .select("id")
      .single();
    if (i1Error || !i1)
      throw new Error(`failed to seed F1 item: ${i1Error?.message}`);
    itemF1 = i1.id;

    const { data: t2, error: t2Error } = await admin
      .from("procedure_templates")
      .insert({
        family_id: familyF2,
        life_event_kind: "birth",
        title: "出産でやること",
        created_by: memberCId,
      })
      .select("id")
      .single();
    if (t2Error || !t2)
      throw new Error(`failed to seed F2 template: ${t2Error?.message}`);
    templateF2 = t2.id;

    const { data: i2, error: i2Error } = await admin
      .from("procedure_template_items")
      .insert({
        template_id: templateF2,
        sort_order: 1,
        title: "出生届を出す",
        category: "birth_registration",
      })
      .select("id")
      .single();
    if (i2Error || !i2)
      throw new Error(`failed to seed F2 item: ${i2Error?.message}`);
    itemF2 = i2.id;

    const { data: c1, error: c1Error } = await admin
      .from("children")
      .insert({
        family_id: familyF1,
        display_name: "長女",
        birth_date: "2026-08-01",
        created_by: memberAId,
      })
      .select("id")
      .single();
    if (c1Error || !c1)
      throw new Error(`failed to seed F1 child: ${c1Error?.message}`);
    childF1 = c1.id;
  });

  afterAll(async () => {
    await admin
      .from("family_procedures")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await admin.from("children").delete().in("family_id", [familyF1, familyF2]);
    await admin
      .from("procedure_templates")
      .delete()
      .in("id", [templateF1, templateF2]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  describe("procedure_templates", () => {
    it("a member can select their own family's template but not another family's", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: own, error: ownError } = await clientA
        .from("procedure_templates")
        .select("id")
        .eq("id", templateF1);
      expect(ownError).toBeNull();
      expect(own?.map((t) => t.id)).toContain(templateF1);

      const { data: other, error: otherError } = await clientA
        .from("procedure_templates")
        .select("id")
        .eq("id", templateF2);
      expect(otherError).toBeNull();
      expect(other).toHaveLength(0);
    });

    it("a member can edit their own family's template title", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA
        .from("procedure_templates")
        .update({ title: "出産の準備" })
        .eq("id", templateF1);
      expect(error).toBeNull();

      await admin
        .from("procedure_templates")
        .update({ title: "出産でやること" })
        .eq("id", templateF1);
    });

    it("cannot insert a template into another family", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("procedure_templates").insert({
        family_id: familyF2,
        life_event_kind: "birth",
        title: "なりすまし",
        created_by: memberAId,
      });
      expect(error).not.toBeNull();
    });

    it("a family cannot have two active templates for the same life_event_kind", async () => {
      const { error } = await admin.from("procedure_templates").insert({
        family_id: familyF1,
        life_event_kind: "birth",
        title: "重複テンプレート",
        created_by: memberAId,
      });
      expect(error).not.toBeNull();
    });
  });

  describe("procedure_template_items", () => {
    it("a member can select items belonging to their own family's template only", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: own } = await clientA
        .from("procedure_template_items")
        .select("id")
        .eq("id", itemF1);
      expect(own?.map((i) => i.id)).toContain(itemF1);

      const { data: other, error: otherError } = await clientA
        .from("procedure_template_items")
        .select("id")
        .eq("id", itemF2);
      expect(otherError).toBeNull();
      expect(other).toHaveLength(0);
    });

    it("a member can add and soft-delete an item on their own family's template", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data: created, error: createError } = await clientA
        .from("procedure_template_items")
        .insert({
          template_id: templateF1,
          sort_order: 2,
          title: "追加した項目",
        })
        .select("id")
        .single();
      expect(createError).toBeNull();
      expect(created?.id).toBeTruthy();

      const { error: deleteError } = await clientA
        .from("procedure_template_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", created?.id ?? "");
      expect(deleteError).toBeNull();
    });

    it("cannot add an item to another family's template", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("procedure_template_items").insert({
        template_id: templateF2,
        sort_order: 2,
        title: "なりすまし項目",
      });
      expect(error).not.toBeNull();
    });
  });

  describe("family_procedures with template_item_id", () => {
    it("a member can link their own family's template item and child", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("family_procedures")
        .insert({
          family_id: familyF1,
          template_item_id: itemF1,
          child_id: childF1,
          added_by: memberAId,
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();

      await admin
        .from("family_procedures")
        .delete()
        .eq("id", data?.id ?? "");
    });

    it("cannot link using another family's template_item_id", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("family_procedures").insert({
        family_id: familyF1,
        template_item_id: itemF2,
        added_by: memberAId,
      });
      expect(error).not.toBeNull();
    });

    it("rejects a row with neither procedure_id nor template_item_id", async () => {
      const { error } = await admin.from("family_procedures").insert({
        family_id: familyF1,
        added_by: memberAId,
      });
      expect(error).not.toBeNull();
    });
  });
});
