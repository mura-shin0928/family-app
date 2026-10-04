import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

// created_by で family_members を参照しているテーブル
const AUTHORED_TABLES = [
  "tasks",
  "recipes",
  "children",
  "purchase_locations",
  "life_event_items",
] as const;
type AuthoredTable = (typeof AUTHORED_TABLES)[number];

describe("作成済みデータを持つメンバーの削除", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyId: string;
  let childId: string;
  const owner = { email: `owner-${runId}@example.test` };
  const userIds: string[] = [];
  const familyIds: string[] = [];

  async function createFamily(name: string): Promise<string> {
    const { data, error } = await admin
      .from("families")
      .insert({ name: `${name}-${runId}` })
      .select("id")
      .single();
    if (error || !data)
      throw new Error(`failed to create family: ${error?.message}`);
    familyIds.push(data.id);
    return data.id;
  }

  async function addMember(
    label: string,
    targetFamilyId = familyId,
  ): Promise<{ memberId: string; userId: string; email: string }> {
    const email = `${label}-${runId}@example.test`;
    const user = await createConfirmedUser(admin, email, PASSWORD);
    userIds.push(user.id);
    const { data, error } = await admin
      .from("family_members")
      .insert({
        family_id: targetFamilyId,
        user_id: user.id,
        display_name: label,
      })
      .select("id")
      .single();
    if (error || !data)
      throw new Error(`failed to seed member: ${error?.message}`);
    return { memberId: data.id, userId: user.id, email };
  }

  async function seedAuthoredRow(
    table: AuthoredTable,
    memberId: string,
    targetFamilyId = familyId,
  ): Promise<void> {
    const base = { family_id: targetFamilyId, created_by: memberId };
    const rows: Record<AuthoredTable, Record<string, unknown>> = {
      tasks: { ...base, title: "タスク", sort_order: 1 },
      recipes: { ...base, title: "レシピ" },
      children: { ...base, display_name: "こども" },
      purchase_locations: { ...base, name: `店-${randomUUID().slice(0, 8)}` },
      life_event_items: {
        ...base,
        child_id: childId,
        title: "項目",
        status: "in_task",
      },
    };
    const { error } = await admin.from(table).insert(rows[table]);
    if (error) throw new Error(`failed to seed ${table}: ${error.message}`);
  }

  async function memberExists(memberId: string): Promise<boolean> {
    const { data } = await admin
      .from("family_members")
      .select("id")
      .eq("id", memberId);
    return (data ?? []).length > 0;
  }

  beforeAll(async () => {
    familyId = await createFamily("F");
    const ownerMember = await addMember("owner");
    owner.email = ownerMember.email;

    const { data: child, error } = await admin
      .from("children")
      .insert({
        family_id: familyId,
        display_name: "こども",
        created_by: ownerMember.memberId,
      })
      .select("id")
      .single();
    if (error || !child)
      throw new Error(`failed to seed child: ${error?.message}`);
    childId = child.id;
  });

  afterAll(async () => {
    // created_by の制約に当たらないよう、参照している行から先に消す
    for (const table of [
      "tasks",
      "life_event_items",
      "recipes",
      "purchase_locations",
      "children",
    ]) {
      await admin.from(table).delete().in("family_id", familyIds);
    }
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
    await admin.from("families").delete().in("id", familyIds);
  });

  it("何も作成していないメンバーは削除できる（対照）", async () => {
    const target = await addMember("empty");
    const client = await signInAsClient(owner.email, PASSWORD);

    const { error } = await client
      .from("family_members")
      .delete()
      .eq("id", target.memberId)
      .eq("family_id", familyId);

    expect(error).toBeNull();
    expect(await memberExists(target.memberId)).toBe(false);
  });

  // removeMember / removeAdminMember と同じクエリ
  it.each(
    AUTHORED_TABLES,
  )("%s を作成したメンバーを家族から削除できる", async (table) => {
    const target = await addMember(`author-${table}`);
    await seedAuthoredRow(table, target.memberId);
    const client = await signInAsClient(owner.email, PASSWORD);

    const { error } = await client
      .from("family_members")
      .delete()
      .eq("id", target.memberId)
      .eq("family_id", familyId);

    expect(error).toBeNull();
    expect(await memberExists(target.memberId)).toBe(false);
  });

  it("削除されたメンバーが作ったタスクは残り、残りのメンバーが更新できる", async () => {
    const target = await addMember("author-kept");
    const title = `残るタスク-${randomUUID().slice(0, 8)}`;
    const { data: task, error: seedError } = await admin
      .from("tasks")
      .insert({
        family_id: familyId,
        title,
        sort_order: 1,
        created_by: target.memberId,
      })
      .select("id")
      .single();
    if (seedError || !task)
      throw new Error(`failed to seed task: ${seedError?.message}`);

    const client = await signInAsClient(owner.email, PASSWORD);
    await client.from("family_members").delete().eq("id", target.memberId);

    const { data: updated, error } = await client
      .from("tasks")
      .update({ title: `${title}-編集` })
      .eq("id", task.id)
      .select("title, created_by");

    expect(error).toBeNull();
    expect(updated).toEqual([{ title: `${title}-編集`, created_by: null }]);
  });

  it("created_by が null の行はクライアントから insert できない", async () => {
    const client = await signInAsClient(owner.email, PASSWORD);

    const { error } = await client.from("tasks").insert({
      family_id: familyId,
      title: "作成者なし",
      sort_order: 1,
      created_by: null,
    });

    expect(error).not.toBeNull();
  });

  // scripts/admin.mts remove-member と同じ経路
  it("タスクを作成したメンバーを auth.users ごと削除できる", async () => {
    const target = await addMember("author-auth");
    await seedAuthoredRow("tasks", target.memberId);

    const { error } = await admin.auth.admin.deleteUser(target.userId);

    expect(error).toBeNull();
    expect(await memberExists(target.memberId)).toBe(false);
  });

  it("タスクを作成したメンバーがいる家族を削除できる", async () => {
    const otherFamilyId = await createFamily("G");
    const target = await addMember("author-family", otherFamilyId);
    await seedAuthoredRow("tasks", target.memberId, otherFamilyId);

    const { error } = await admin
      .from("families")
      .delete()
      .eq("id", otherFamilyId);

    expect(error).toBeNull();
  });
});
