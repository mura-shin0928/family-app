import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

describe("admin_users / is_app_admin() extended RLS", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;

  const adminUser = { email: `admin-${runId}@example.test` };
  // F1のメンバー。app_adminではない一般ユーザーとの比較対象。
  const userA = { email: `a-${runId}@example.test` };
  // F2のメンバー。
  const userC = { email: `c-${runId}@example.test` };

  const userIds: Record<string, string> = {};
  let memberAId: string;
  let memberCId: string;

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `AdminF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `AdminF2-${runId}` })
      .select("id")
      .single();
    if (f2Error || !f2)
      throw new Error(`failed to create F2: ${f2Error?.message}`);
    familyF2 = f2.id;

    const created = await Promise.all([
      createConfirmedUser(admin, adminUser.email, PASSWORD),
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
    memberAId =
      members.find((m) => m.user_id === userIds[userA.email])?.id ?? "";
    memberCId =
      members.find((m) => m.user_id === userIds[userC.email])?.id ?? "";

    const { error: adminInsertError } = await admin
      .from("admin_users")
      .insert({ user_id: userIds[adminUser.email] });
    if (adminInsertError)
      throw new Error(
        `failed to seed admin_users: ${adminInsertError.message}`,
      );
  });

  afterAll(async () => {
    await admin
      .from("invitations")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await admin
      .from("admin_users")
      .delete()
      .eq("user_id", userIds[adminUser.email]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  it("is_app_admin() returns true only for the seeded admin", async () => {
    const clientAdmin = await signInAsClient(adminUser.email, PASSWORD);
    const { data: isAdmin, error } = await clientAdmin.rpc("is_app_admin");
    expect(error).toBeNull();
    expect(isAdmin).toBe(true);

    const clientA = await signInAsClient(userA.email, PASSWORD);
    const { data: isNotAdmin } = await clientA.rpc("is_app_admin");
    expect(isNotAdmin).toBe(false);
  });

  it("an app_admin can see every family and every family_members row", async () => {
    const clientAdmin = await signInAsClient(adminUser.email, PASSWORD);

    const { data: families, error } = await clientAdmin
      .from("families")
      .select("id")
      .in("id", [familyF1, familyF2]);
    expect(error).toBeNull();
    expect(families?.map((f) => f.id).sort()).toEqual(
      [familyF1, familyF2].sort(),
    );

    const { data: members } = await clientAdmin
      .from("family_members")
      .select("display_name")
      .in("family_id", [familyF1, familyF2]);
    expect((members ?? []).map((m) => m.display_name).sort()).toEqual([
      "A",
      "C",
    ]);
  });

  it("a non-admin still cannot see another family", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);
    const { data: families, error } = await clientA
      .from("families")
      .select("id")
      .eq("id", familyF2);
    expect(error).toBeNull();
    expect(families).toHaveLength(0);
  });

  it("an app_admin can create a new family; a non-admin cannot", async () => {
    const clientAdmin = await signInAsClient(adminUser.email, PASSWORD);
    const { data: created, error } = await clientAdmin
      .from("families")
      .insert({ name: `AdminCreated-${runId}` })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(created?.id).toBeTruthy();
    if (created) {
      await admin.from("families").delete().eq("id", created.id);
    }

    const clientA = await signInAsClient(userA.email, PASSWORD);
    const { error: deniedError } = await clientA
      .from("families")
      .insert({ name: "hijack" });
    expect(deniedError).not.toBeNull();
  });

  it("an app_admin can delete a member row in a family they don't belong to", async () => {
    const target = await createConfirmedUser(
      admin,
      `admin-del-${runId}@example.test`,
      PASSWORD,
    );
    userIds[target.email] = target.id;

    const { data: seeded, error: seedError } = await admin
      .from("family_members")
      .insert({
        family_id: familyF2,
        user_id: target.id,
        display_name: "AdminDelTarget",
      })
      .select("id")
      .single();
    if (seedError || !seeded)
      throw new Error(`failed to seed temp member: ${seedError?.message}`);

    const clientAdmin = await signInAsClient(adminUser.email, PASSWORD);
    const { error: deleteError } = await clientAdmin
      .from("family_members")
      .delete()
      .eq("id", seeded.id);
    expect(deleteError).toBeNull();

    const { data: after } = await admin
      .from("family_members")
      .select("id")
      .eq("id", seeded.id);
    expect(after).toHaveLength(0);
  });

  it("an app_admin can issue an invitation with invited_by = null for any family", async () => {
    const clientAdmin = await signInAsClient(adminUser.email, PASSWORD);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: invitation, error } = await clientAdmin
      .from("invitations")
      .insert({
        family_id: familyF2,
        token_hash: `admin-issued-${runId}`,
        invited_email: `invitee-admin-${runId}@example.test`,
        display_name: "AdminInvited",
        invited_by: null,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(invitation?.id).toBeTruthy();
  });

  it("an app_admin cannot forge invited_by when issuing an invitation", async () => {
    const clientAdmin = await signInAsClient(adminUser.email, PASSWORD);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await clientAdmin.from("invitations").insert({
      family_id: familyF1,
      token_hash: `admin-forged-${runId}`,
      invited_email: `invitee-forged-${runId}@example.test`,
      display_name: "Forged",
      invited_by: memberAId,
      expires_at: expiresAt,
    });
    expect(error).not.toBeNull();
  });

  it("an app_admin still cannot read another family's tasks or recipes", async () => {
    const { data: task, error: taskInsertError } = await admin
      .from("tasks")
      .insert({
        family_id: familyF2,
        title: `secret-task-${runId}`,
        sort_order: 1,
        created_by: memberCId,
      })
      .select("id")
      .single();
    if (taskInsertError || !task)
      throw new Error(`failed to seed task: ${taskInsertError?.message}`);

    const { data: recipe, error: recipeInsertError } = await admin
      .from("recipes")
      .insert({
        family_id: familyF2,
        title: `secret-recipe-${runId}`,
        created_by: memberCId,
      })
      .select("id")
      .single();
    if (recipeInsertError || !recipe)
      throw new Error(`failed to seed recipe: ${recipeInsertError?.message}`);

    const clientAdmin = await signInAsClient(adminUser.email, PASSWORD);

    const { data: tasks } = await clientAdmin
      .from("tasks")
      .select("id")
      .eq("id", task.id);
    expect(tasks).toHaveLength(0);

    const { data: recipes } = await clientAdmin
      .from("recipes")
      .select("id")
      .eq("id", recipe.id);
    expect(recipes).toHaveLength(0);

    await admin.from("tasks").delete().eq("id", task.id);
    await admin.from("recipes").delete().eq("id", recipe.id);
  });

  it("no client can read or write admin_users directly (not even the admin themself)", async () => {
    const clientAdmin = await signInAsClient(adminUser.email, PASSWORD);
    // authenticated には select すら grant していないため、空配列ではなく
    // permission denied になる（is_app_admin() 経由でしか判定できない）。
    const { error } = await clientAdmin.from("admin_users").select("*");
    expect(error?.code).toBe("42501");

    const { error: insertError } = await clientAdmin
      .from("admin_users")
      .insert({ user_id: userIds[userA.email] });
    expect(insertError).not.toBeNull();
  });
});
