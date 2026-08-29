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

describe("purchase_locations RLS", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberCId: string;
  let locationF1: string;
  let locationF2: string;

  const userA = { email: `pl-a-${runId}@example.test` };
  const userC = { email: `pl-c-${runId}@example.test` };
  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `PLF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `PLF2-${runId}` })
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

    const { data: l1, error: l1Error } = await admin
      .from("purchase_locations")
      .insert({ family_id: familyF1, name: "スーパー", created_by: memberAId })
      .select("id")
      .single();
    if (l1Error || !l1)
      throw new Error(`failed to seed F1 location: ${l1Error?.message}`);
    locationF1 = l1.id;

    const { data: l2, error: l2Error } = await admin
      .from("purchase_locations")
      .insert({
        family_id: familyF2,
        name: "ドラッグストア",
        created_by: memberCId,
      })
      .select("id")
      .single();
    if (l2Error || !l2)
      throw new Error(`failed to seed F2 location: ${l2Error?.message}`);
    locationF2 = l2.id;
  });

  afterAll(async () => {
    await admin
      .from("purchase_locations")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  it("a member sees their own family's locations but not another family's", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data: own, error: ownError } = await clientA
      .from("purchase_locations")
      .select("id")
      .eq("family_id", familyF1);
    expect(ownError).toBeNull();
    expect(own?.map((l) => l.id)).toContain(locationF1);

    const { data: other, error: otherError } = await clientA
      .from("purchase_locations")
      .select("id")
      .eq("id", locationF2);
    expect(otherError).toBeNull();
    expect(other).toHaveLength(0);
  });

  it("a member can insert a location into their own family", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data, error } = await clientA
      .from("purchase_locations")
      .insert({ family_id: familyF1, name: "コンビニ", created_by: memberAId })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it("cannot insert a location into another family", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error } = await clientA.from("purchase_locations").insert({
      family_id: familyF2,
      name: "なりすまし",
      created_by: memberAId,
    });

    expect(error).not.toBeNull();
  });

  it("cannot insert with created_by pointing at another family's member", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error } = await clientA.from("purchase_locations").insert({
      family_id: familyF1,
      name: "created_byなりすまし",
      created_by: memberCId,
    });

    expect(error).not.toBeNull();
  });

  it("cannot update another family's location", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data, error } = await clientA
      .from("purchase_locations")
      .update({ name: "改ざん" })
      .eq("id", locationF2)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    const { data: check } = await admin
      .from("purchase_locations")
      .select("name")
      .eq("id", locationF2)
      .single();
    expect(check?.name).toBe("ドラッグストア");
  });

  it("can soft-delete (update deleted_at) their own family's location", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data: created, error: createError } = await admin
      .from("purchase_locations")
      .insert({ family_id: familyF1, name: "削除予定", created_by: memberAId })
      .select("id")
      .single();
    if (createError || !created)
      throw new Error(`failed to seed location: ${createError?.message}`);

    const { error } = await clientA
      .from("purchase_locations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", created.id);
    expect(error).toBeNull();

    const { data: check } = await admin
      .from("purchase_locations")
      .select("deleted_at")
      .eq("id", created.id)
      .single();
    expect(check?.deleted_at).not.toBeNull();
  });

  it("no client can hard-delete a location (no delete policy)", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error } = await clientA
      .from("purchase_locations")
      .delete()
      .eq("id", locationF1);
    expect(error).not.toBeNull();

    const { data: check } = await admin
      .from("purchase_locations")
      .select("id")
      .eq("id", locationF1)
      .single();
    expect(check?.id).toBe(locationF1);
  });

  it("an unauthenticated client sees no locations", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon
      .from("purchase_locations")
      .select("id")
      .eq("family_id", familyF1);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
