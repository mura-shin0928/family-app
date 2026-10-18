import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

// family_id を持つテーブル（family_members は除く）
const FAMILY_TABLES = [
  "children",
  "invitations",
  "life_event_items",
  "purchase_locations",
  "recipe_analysis_usage",
  "recipe_ingredients",
  "recipes",
  "tasks",
  "web_search_usage",
] as const;

type Member = { memberId: string; userId: string; email: string };

describe("delete_my_family", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const familyIds: string[] = [];

  const familyAName = `退会する家族-${runId}`;
  let familyA: string;
  let familyB: string;
  let familyC: string;
  let memberA1: Member;
  let memberA2: Member;
  let memberB1: Member;
  let memberC1: Member;
  let clientA1: SupabaseClient;
  let clientA2: SupabaseClient;

  async function createFamily(name: string): Promise<string> {
    const { data, error } = await admin
      .from("families")
      .insert({ name })
      .select("id")
      .single();
    if (error || !data)
      throw new Error(`failed to create family: ${error?.message}`);
    familyIds.push(data.id);
    return data.id;
  }

  async function addMember(label: string, familyId: string): Promise<Member> {
    const email = `${label}-${runId}@example.test`;
    const user = await createConfirmedUser(admin, email, PASSWORD);
    userIds.push(user.id);
    const { data, error } = await admin
      .from("family_members")
      .insert({ family_id: familyId, user_id: user.id, display_name: label })
      .select("id")
      .single();
    if (error || !data)
      throw new Error(`failed to seed member: ${error?.message}`);
    return { memberId: data.id, userId: user.id, email };
  }

  async function insert(
    table: string,
    row: Record<string, unknown>,
  ): Promise<string | undefined> {
    const { data, error } = await admin.from(table).insert(row).select();
    if (error) throw new Error(`failed to seed ${table}: ${error.message}`);
    return (data?.[0] as { id?: string } | undefined)?.id;
  }

  async function countRows(table: string, familyId: string): Promise<number> {
    const { count, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("family_id", familyId);
    if (error) throw new Error(`failed to count ${table}: ${error.message}`);
    return count ?? 0;
  }

  async function userExists(userId: string): Promise<boolean> {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user !== null;
  }

  beforeAll(async () => {
    familyA = await createFamily(familyAName);
    memberA1 = await addMember("a1", familyA);
    memberA2 = await addMember("a2", familyA);
    const base = { family_id: familyA, created_by: memberA1.memberId };
    const childId = await insert("children", {
      ...base,
      display_name: "こども",
    });
    const taskId = await insert("tasks", {
      ...base,
      title: "タスク",
      sort_order: 1,
    });
    const recipeId = await insert("recipes", { ...base, title: "レシピ" });
    await insert("recipe_ingredients", {
      family_id: familyA,
      recipe_id: recipeId,
      name: "牛乳",
      sort_order: 1,
      task_id: taskId,
    });
    await insert("purchase_locations", { ...base, name: "スーパー" });
    await insert("life_event_items", {
      ...base,
      child_id: childId,
      title: "項目",
      status: "in_task",
    });
    await insert("invitations", {
      family_id: familyA,
      token_hash: `hash-${runId}`,
      invited_email: `invitee-${runId}@example.test`,
      display_name: "招待中",
      invited_by: memberA1.memberId,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const today = new Date().toISOString().slice(0, 10);
    await insert("recipe_analysis_usage", {
      family_id: familyA,
      day: today,
      count: 1,
    });
    await insert("web_search_usage", {
      family_id: familyA,
      day: today,
      count: 1,
    });

    familyB = await createFamily(`残る家族-${runId}`);
    memberB1 = await addMember("b1", familyB);
    await insert("tasks", {
      family_id: familyB,
      created_by: memberB1.memberId,
      title: "残るタスク",
      sort_order: 1,
    });

    familyC = await createFamily(`管理者の家族-${runId}`);
    memberC1 = await addMember("c1", familyC);
    const memberC2 = await addMember("c2", familyC);
    await insert("admin_users", { user_id: memberC2.userId });

    clientA1 = await signInAsClient(memberA1.email, PASSWORD);
    clientA2 = await signInAsClient(memberA2.email, PASSWORD);
  });

  afterAll(async () => {
    await admin.from("tasks").delete().in("family_id", familyIds);
    await admin.from("admin_users").delete().in("user_id", userIds);
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
    await admin.from("families").delete().in("id", familyIds);
  });

  it("家族名が違えば family_name_mismatch で拒否し、何も消さない", async () => {
    const { error } = await clientA1.rpc("delete_my_family", {
      p_family_id: familyA,
      p_confirm_name: `${familyAName}x`,
    });

    expect(error?.message).toBe("family_name_mismatch");
    expect(await countRows("tasks", familyA)).toBe(1);
    expect(await userExists(memberA1.userId)).toBe(true);
  });

  it("別の家族の id を渡すと not_family_member で拒否する", async () => {
    const clientB1 = await signInAsClient(memberB1.email, PASSWORD);
    const { error } = await clientB1.rpc("delete_my_family", {
      p_family_id: familyA,
      p_confirm_name: familyAName,
    });

    expect(error?.message).toBe("not_family_member");
    expect(await countRows("tasks", familyA)).toBe(1);
  });

  it("app_admin がいる家族は family_has_app_admin で拒否する", async () => {
    const clientC1 = await signInAsClient(memberC1.email, PASSWORD);
    const { error } = await clientC1.rpc("delete_my_family", {
      p_family_id: familyC,
      p_confirm_name: `管理者の家族-${runId}`,
    });

    expect(error?.message).toBe("family_has_app_admin");
    expect(await userExists(memberC1.userId)).toBe(true);
  });

  it("家族名が一致すれば、家族の全データとメンバーのログインが消える", async () => {
    const { error } = await clientA1.rpc("delete_my_family", {
      p_family_id: familyA,
      p_confirm_name: `  ${familyAName}\n`,
    });

    expect(error).toBeNull();
    for (const table of FAMILY_TABLES) {
      expect(await countRows(table, familyA), table).toBe(0);
    }
    expect(await countRows("family_members", familyA)).toBe(0);
    const { data: family } = await admin
      .from("families")
      .select("id")
      .eq("id", familyA);
    expect(family).toEqual([]);
    expect(await userExists(memberA1.userId)).toBe(false);
    expect(await userExists(memberA2.userId)).toBe(false);
  });

  it("別の家族のデータは消えない", async () => {
    expect(await countRows("tasks", familyB)).toBe(1);
    expect(await userExists(memberB1.userId)).toBe(true);
  });

  it("配偶者のセッションはユーザーが見つからなくなり、家族の行も読めない", async () => {
    const { data: auth } = await clientA2.auth.getUser();
    expect(auth.user).toBeNull();

    const { data } = await clientA2
      .from("family_members")
      .select("id")
      .eq("family_id", familyA);
    expect(data ?? []).toEqual([]);
  });

  it("DB の家族名の前後に空白があっても、空白を除いた名前で退会できる", async () => {
    const name = `空白つき-${runId}`;
    const familyId = await createFamily(` ${name} `);
    const member = await addMember("spaced", familyId);
    const client = await signInAsClient(member.email, PASSWORD);

    const { error } = await client.rpc("delete_my_family", {
      p_family_id: familyId,
      p_confirm_name: name,
    });

    expect(error).toBeNull();
    expect(await userExists(member.userId)).toBe(false);
  });
});
