import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

describe("children RLS", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberBId: string;
  let childF1: string;

  const userA = { email: `ch-a-${runId}@example.test` };
  const userB = { email: `ch-b-${runId}@example.test` };
  const userC = { email: `ch-c-${runId}@example.test` };
  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `ChildrenF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `ChildrenF2-${runId}` })
      .select("id")
      .single();
    if (f2Error || !f2)
      throw new Error(`failed to create F2: ${f2Error?.message}`);
    familyF2 = f2.id;

    const created = await Promise.all([
      createConfirmedUser(admin, userA.email, PASSWORD),
      createConfirmedUser(admin, userB.email, PASSWORD),
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
          family_id: familyF1,
          user_id: userIds[userB.email],
          display_name: "B",
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
    memberBId = findMemberId(userIds[userB.email]);

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
    await admin.from("children").delete().in("family_id", [familyF1, familyF2]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  it("a member can select their own family's children but not another family's", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data: own, error: ownError } = await clientA
      .from("children")
      .select("id")
      .eq("family_id", familyF1);
    expect(ownError).toBeNull();
    expect(own?.map((c) => c.id)).toContain(childF1);

    const clientC = await signInAsClient(userC.email, PASSWORD);
    const { data: other, error: otherError } = await clientC
      .from("children")
      .select("id")
      .eq("id", childF1);
    expect(otherError).toBeNull();
    expect(other).toHaveLength(0);
  });

  it("a member can insert a child into their own family", async () => {
    const clientB = await signInAsClient(userB.email, PASSWORD);

    const { data, error } = await clientB
      .from("children")
      .insert({
        family_id: familyF1,
        display_name: "次女（予定）",
        expected_birth_date: "2027-01-01",
        created_by: memberBId,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    await admin
      .from("children")
      .delete()
      .eq("id", data?.id ?? "");
  });

  it("can insert a child with no dates yet (妊活中で予定日が未定のケース)", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data, error } = await clientA
      .from("children")
      .insert({
        family_id: familyF1,
        display_name: "妊活メモ",
        created_by: memberAId,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    await admin
      .from("children")
      .delete()
      .eq("id", data?.id ?? "");
  });

  it("cannot insert a child into another family", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error } = await clientA.from("children").insert({
      family_id: familyF2,
      display_name: "なりすまし",
      birth_date: "2026-01-01",
      created_by: memberAId,
    });

    expect(error).not.toBeNull();
  });

  it("a member can soft-delete their own family's child", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data: created, error: createError } = await admin
      .from("children")
      .insert({
        family_id: familyF1,
        display_name: "削除予定",
        birth_date: "2026-01-01",
        created_by: memberAId,
      })
      .select("id")
      .single();
    if (createError || !created)
      throw new Error(`failed to seed: ${createError?.message}`);

    const { error } = await clientA
      .from("children")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", created.id);
    expect(error).toBeNull();
  });
});
