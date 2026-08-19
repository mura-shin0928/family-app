import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createAnonClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

describe("families / family_members RLS", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;

  const userA = { email: `a-${runId}@example.test` };
  const userB = { email: `b-${runId}@example.test` };
  const userC = { email: `c-${runId}@example.test` };
  // family_members に一切登録されていない未所属ユーザー
  const userD = { email: `d-${runId}@example.test` };

  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `F1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `F2-${runId}` })
      .select("id")
      .single();
    if (f2Error || !f2)
      throw new Error(`failed to create F2: ${f2Error?.message}`);
    familyF2 = f2.id;

    const created = await Promise.all([
      createConfirmedUser(admin, userA.email, PASSWORD),
      createConfirmedUser(admin, userB.email, PASSWORD),
      createConfirmedUser(admin, userC.email, PASSWORD),
      createConfirmedUser(admin, userD.email, PASSWORD),
    ]);
    for (const u of created) userIds[u.email] = u.id;

    // 実際の参加経路は招待の受諾（accept_invitation）だが、このテストの関心は
    // familes/family_members のSELECT/書き込みRLSなので、member行は
    // service_roleで直接 user_id を入れて作る。
    const { error: membersError } = await admin.from("family_members").insert([
      { family_id: familyF1, user_id: userIds[userA.email], display_name: "A" },
      { family_id: familyF1, user_id: userIds[userB.email], display_name: "B" },
      { family_id: familyF2, user_id: userIds[userC.email], display_name: "C" },
      // userD 用の行は作らない（未所属）
    ]);
    if (membersError)
      throw new Error(`failed to seed family_members: ${membersError.message}`);
  });

  afterAll(async () => {
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  it("a family member can only see their own family via RLS", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data: families, error } = await clientA
      .from("families")
      .select("id");
    expect(error).toBeNull();
    expect(families?.map((f) => f.id)).toEqual([familyF1]);

    const { data: members } = await clientA
      .from("family_members")
      .select("display_name");
    const names = (members ?? []).map((m) => m.display_name).sort();
    expect(names).toEqual(["A", "B"]);
  });

  it("a member of another family cannot see F1's data", async () => {
    const clientC = await signInAsClient(userC.email, PASSWORD);

    const { data: families, error } = await clientC
      .from("families")
      .select("id")
      .eq("id", familyF1);
    expect(error).toBeNull();
    expect(families).toHaveLength(0);

    const { data: members } = await clientC
      .from("family_members")
      .select("id")
      .eq("family_id", familyF1);
    expect(members).toHaveLength(0);
  });

  it("an unregistered user sees no families at all", async () => {
    const clientD = await signInAsClient(userD.email, PASSWORD);

    const { data: families, error } = await clientD
      .from("families")
      .select("id");
    expect(error).toBeNull();
    expect(families).toHaveLength(0);
  });

  it("an unauthenticated (anon) client sees nothing", async () => {
    const anon = createAnonClient();
    const { data: families, error } = await anon.from("families").select("id");
    expect(error).toBeNull();
    expect(families).toHaveLength(0);
  });

  it("no client can write to families or family_members (no write policies)", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error: insertError } = await clientA
      .from("families")
      .insert({ name: "hijack" });
    expect(insertError).not.toBeNull();

    const { error: updateError } = await clientA
      .from("family_members")
      .update({ display_name: "hijacked" })
      .eq("family_id", familyF1);
    expect(updateError).not.toBeNull();

    const { error: deleteError } = await clientA
      .from("families")
      .delete()
      .eq("id", familyF1);
    expect(deleteError).not.toBeNull();
  });
});
