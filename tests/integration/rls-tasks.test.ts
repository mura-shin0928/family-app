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

describe("tasks RLS", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberBId: string;
  let memberCId: string;
  let taskF1: string;
  let taskF2: string;

  const userA = { email: `a-${runId}@example.test` };
  const userB = { email: `b-${runId}@example.test` };
  const userC = { email: `c-${runId}@example.test` };
  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `TasksF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `TasksF2-${runId}` })
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
    memberCId = findMemberId(userIds[userC.email]);

    const { data: t1, error: t1Error } = await admin
      .from("tasks")
      .insert({
        family_id: familyF1,
        title: "F1のタスク",
        sort_order: 1,
        created_by: memberAId,
      })
      .select("id")
      .single();
    if (t1Error || !t1)
      throw new Error(`failed to seed F1 task: ${t1Error?.message}`);
    taskF1 = t1.id;

    const { data: t2, error: t2Error } = await admin
      .from("tasks")
      .insert({
        family_id: familyF2,
        title: "F2のタスク",
        sort_order: 1,
        created_by: memberCId,
      })
      .select("id")
      .single();
    if (t2Error || !t2)
      throw new Error(`failed to seed F2 task: ${t2Error?.message}`);
    taskF2 = t2.id;
  });

  afterAll(async () => {
    await admin.from("tasks").delete().in("family_id", [familyF1, familyF2]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  it("a member can select their own family's tasks but not another family's", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data: ownTasks, error: ownError } = await clientA
      .from("tasks")
      .select("id")
      .eq("family_id", familyF1);
    expect(ownError).toBeNull();
    expect(ownTasks?.map((t) => t.id)).toContain(taskF1);

    const { data: otherTasks, error: otherError } = await clientA
      .from("tasks")
      .select("id")
      .eq("id", taskF2);
    expect(otherError).toBeNull();
    expect(otherTasks).toHaveLength(0);
  });

  it("a member can insert a task into their own family", async () => {
    const clientB = await signInAsClient(userB.email, PASSWORD);

    const { data, error } = await clientB
      .from("tasks")
      .insert({
        family_id: familyF1,
        title: "Bが追加したタスク",
        sort_order: 2,
        created_by: memberBId,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it("cannot insert a task into another family", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error } = await clientA.from("tasks").insert({
      family_id: familyF2,
      title: "なりすまし挿入",
      sort_order: 99,
      created_by: memberAId,
    });

    expect(error).not.toBeNull();
  });

  it("cannot insert with created_by pointing at another family's member", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error } = await clientA.from("tasks").insert({
      family_id: familyF1,
      title: "created_byなりすまし",
      sort_order: 3,
      created_by: memberCId,
    });

    expect(error).not.toBeNull();
  });

  it("a member can update (complete) their own family's task", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error } = await clientA
      .from("tasks")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
        completed_by: memberAId,
      })
      .eq("id", taskF1);
    expect(error).toBeNull();

    const { data } = await admin
      .from("tasks")
      .select("status")
      .eq("id", taskF1)
      .single();
    expect(data?.status).toBe("done");

    // 元に戻しておく（他テストへの影響を避ける）
    await admin
      .from("tasks")
      .update({ status: "open", completed_at: null, completed_by: null })
      .eq("id", taskF1);
  });

  it("a member can set and clear url/note on their own family's task (T1)", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error: setError } = await clientA
      .from("tasks")
      .update({
        url: "https://www.city.koganei.lg.jp/kosodatekyoiku/433/index.html",
        note: "母子手帳を持っていく",
      })
      .eq("id", taskF1);
    expect(setError).toBeNull();

    const { data: set } = await admin
      .from("tasks")
      .select("url, note")
      .eq("id", taskF1)
      .single();
    expect(set?.url).toBe(
      "https://www.city.koganei.lg.jp/kosodatekyoiku/433/index.html",
    );
    expect(set?.note).toBe("母子手帳を持っていく");

    const { error: clearError } = await clientA
      .from("tasks")
      .update({ url: null, note: null })
      .eq("id", taskF1);
    expect(clearError).toBeNull();

    const { data: cleared } = await admin
      .from("tasks")
      .select("url, note")
      .eq("id", taskF1)
      .single();
    expect(cleared?.url).toBeNull();
    expect(cleared?.note).toBeNull();
  });

  it("rejects a url longer than 2000 characters (DB check constraint)", async () => {
    const tooLong = `https://example.test/${"a".repeat(2000)}`;

    const { error } = await admin
      .from("tasks")
      .update({ url: tooLong })
      .eq("id", taskF1);

    expect(error).not.toBeNull();
  });

  it("cannot update another family's task", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { data, error } = await clientA
      .from("tasks")
      .update({ title: "改ざん" })
      .eq("id", taskF2)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    const { data: check } = await admin
      .from("tasks")
      .select("title")
      .eq("id", taskF2)
      .single();
    expect(check?.title).toBe("F2のタスク");
  });

  it("can soft-delete (update deleted_at) their own family's task", async () => {
    const clientB = await signInAsClient(userB.email, PASSWORD);

    const { data: created, error: createError } = await admin
      .from("tasks")
      .insert({
        family_id: familyF1,
        title: "削除予定",
        sort_order: 4,
        created_by: memberBId,
      })
      .select("id")
      .single();
    if (createError || !created)
      throw new Error(`failed to seed task: ${createError?.message}`);

    const { error } = await clientB
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", created.id);
    expect(error).toBeNull();

    const { data: check } = await admin
      .from("tasks")
      .select("deleted_at")
      .eq("id", created.id)
      .single();
    expect(check?.deleted_at).not.toBeNull();
  });

  it("no client can hard-delete a task (no delete policy)", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);

    const { error } = await clientA.from("tasks").delete().eq("id", taskF1);
    expect(error).not.toBeNull();

    const { data: check } = await admin
      .from("tasks")
      .select("id")
      .eq("id", taskF1)
      .single();
    expect(check?.id).toBe(taskF1);
  });

  it("an unauthenticated client sees no tasks", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon
      .from("tasks")
      .select("id")
      .eq("family_id", familyF1);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
