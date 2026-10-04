import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";
const DEFAULT_DAILY_LIMIT = 30;

describe("レシピ解析の利用枠", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let clientC: SupabaseClient;
  let clientOutsider: SupabaseClient;
  let clientAdmin: SupabaseClient;

  const emailA = `qa-${runId}@example.test`;
  const emailB = `qb-${runId}@example.test`;
  const emailC = `qc-${runId}@example.test`;
  const emailOutsider = `qo-${runId}@example.test`;
  const emailAdmin = `qadmin-${runId}@example.test`;
  const userIds: string[] = [];

  beforeAll(async () => {
    const { data: families, error: familiesError } = await admin
      .from("families")
      .insert([{ name: `QuotaF1-${runId}` }, { name: `QuotaF2-${runId}` }])
      .select("id, name");
    if (familiesError || !families)
      throw new Error(`failed to create families: ${familiesError?.message}`);
    familyF1 = families.find((f) => f.name.startsWith("QuotaF1"))?.id;
    familyF2 = families.find((f) => f.name.startsWith("QuotaF2"))?.id;

    const [a, b, c, outsider, appAdmin] = await Promise.all([
      createConfirmedUser(admin, emailA, PASSWORD),
      createConfirmedUser(admin, emailB, PASSWORD),
      createConfirmedUser(admin, emailC, PASSWORD),
      createConfirmedUser(admin, emailOutsider, PASSWORD),
      createConfirmedUser(admin, emailAdmin, PASSWORD),
    ]);
    userIds.push(a.id, b.id, c.id, outsider.id, appAdmin.id);

    const { error: adminError } = await admin
      .from("admin_users")
      .insert({ user_id: appAdmin.id });
    if (adminError)
      throw new Error(`failed to seed admin: ${adminError.message}`);

    const { error: membersError } = await admin.from("family_members").insert([
      { family_id: familyF1, user_id: a.id, display_name: "A" },
      { family_id: familyF1, user_id: b.id, display_name: "B" },
      { family_id: familyF2, user_id: c.id, display_name: "C" },
    ]);
    if (membersError)
      throw new Error(`failed to seed members: ${membersError.message}`);

    [clientA, clientB, clientC, clientOutsider, clientAdmin] =
      await Promise.all([
        signInAsClient(emailA, PASSWORD),
        signInAsClient(emailB, PASSWORD),
        signInAsClient(emailC, PASSWORD),
        signInAsClient(emailOutsider, PASSWORD),
        signInAsClient(emailAdmin, PASSWORD),
      ]);
  });

  beforeEach(async () => {
    await admin
      .from("recipe_analysis_usage")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await admin
      .from("families")
      .update({ recipe_analysis_daily_limit: null })
      .in("id", [familyF1, familyF2]);
  });

  afterAll(async () => {
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
    await Promise.all(userIds.map((id) => deleteUser(admin, id)));
  });

  async function consume(client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client.rpc("consume_recipe_analysis_quota");
    if (error) throw new Error(error.message);
    return data;
  }

  async function limitOf(familyId: string): Promise<number | null> {
    const { data, error } = await admin
      .from("families")
      .select("recipe_analysis_daily_limit")
      .eq("id", familyId)
      .single();
    if (error) throw new Error(error.message);
    return data.recipe_analysis_daily_limit;
  }

  async function usageOf(familyId: string) {
    const { data, error } = await admin
      .from("recipe_analysis_usage")
      .select("day, count")
      .eq("family_id", familyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  /** 今日の使用回数を service_role で直接置く。 */
  async function seedUsage(familyId: string, count: number, day?: string) {
    if (day) {
      const { error } = await admin
        .from("recipe_analysis_usage")
        .upsert({ family_id: familyId, day, count });
      if (error) throw new Error(error.message);
      return;
    }
    // 関数と同じ「今日」を得るため、1回使わせてから回数だけ書き換える。
    await consume(familyId === familyF1 ? clientA : clientC);
    const { error } = await admin
      .from("recipe_analysis_usage")
      .update({ count })
      .eq("family_id", familyId);
    if (error) throw new Error(error.message);
  }

  it("家族のメンバーが使うたびに、家族の回数が1ずつ増える", async () => {
    expect(await consume(clientA)).toBe(true);
    expect(await consume(clientB)).toBe(true);

    expect((await usageOf(familyF1))?.count).toBe(2);
  });

  it("上限に達すると false を返し、回数は増えない", async () => {
    await seedUsage(familyF1, DEFAULT_DAILY_LIMIT - 1);

    expect(await consume(clientA)).toBe(true);
    expect(await consume(clientA)).toBe(false);
    expect(await consume(clientB)).toBe(false);

    expect((await usageOf(familyF1))?.count).toBe(DEFAULT_DAILY_LIMIT);
  });

  it("同時に呼んでも上限を超えない", async () => {
    await seedUsage(familyF1, DEFAULT_DAILY_LIMIT - 2);

    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => consume(i % 2 ? clientA : clientB)),
    );

    expect(results.filter(Boolean)).toHaveLength(2);
    expect((await usageOf(familyF1))?.count).toBe(DEFAULT_DAILY_LIMIT);
  });

  it("ある家族が上限に達しても、別の家族は使える", async () => {
    await seedUsage(familyF1, DEFAULT_DAILY_LIMIT);

    expect(await consume(clientA)).toBe(false);
    expect(await consume(clientC)).toBe(true);
    expect((await usageOf(familyF2))?.count).toBe(1);
  });

  it("日付が変わると回数が1から数え直される", async () => {
    await seedUsage(familyF1, DEFAULT_DAILY_LIMIT, "2000-01-01");

    expect(await consume(clientA)).toBe(true);

    const usage = await usageOf(familyF1);
    expect(usage?.count).toBe(1);
    expect(usage?.day).not.toBe("2000-01-01");
  });

  it("家族に所属していないユーザーは使えない", async () => {
    const { error } = await clientOutsider.rpc("consume_recipe_analysis_quota");
    expect(error?.code).toBe("42501");
  });

  it("メンバーは回数の行を直接読めず、書き換えも削除もできない", async () => {
    await seedUsage(familyF1, DEFAULT_DAILY_LIMIT);

    const { data: rows } = await clientA
      .from("recipe_analysis_usage")
      .select("family_id");
    expect(rows ?? []).toEqual([]);

    await clientA
      .from("recipe_analysis_usage")
      .update({ count: 1 })
      .eq("family_id", familyF1);
    await clientA
      .from("recipe_analysis_usage")
      .delete()
      .eq("family_id", familyF1);
    const { error: insertError } = await clientA
      .from("recipe_analysis_usage")
      .insert({ family_id: familyF1, day: "2000-01-01", count: 1 });
    expect(insertError).not.toBeNull();

    expect((await usageOf(familyF1))?.count).toBe(DEFAULT_DAILY_LIMIT);
    expect(await consume(clientA)).toBe(false);
  });

  describe("家族ごとの上限", () => {
    it("app_admin が上限を変えると、その家族だけ新しい上限になる", async () => {
      const { error } = await clientAdmin.rpc(
        "set_family_recipe_analysis_daily_limit",
        { p_family_id: familyF1, p_daily_limit: 2 },
      );
      expect(error).toBeNull();

      expect(await consume(clientA)).toBe(true);
      expect(await consume(clientB)).toBe(true);
      expect(await consume(clientA)).toBe(false);

      await seedUsage(familyF2, 2);
      expect(await consume(clientC)).toBe(true);
    });

    it("上限を 0 にすると、その日の最初の1回から使えない", async () => {
      await clientAdmin.rpc("set_family_recipe_analysis_daily_limit", {
        p_family_id: familyF1,
        p_daily_limit: 0,
      });

      expect(await consume(clientA)).toBe(false);
      expect(await usageOf(familyF1)).toBeNull();
    });

    it("上限を null に戻すと既定値になる", async () => {
      await clientAdmin.rpc("set_family_recipe_analysis_daily_limit", {
        p_family_id: familyF1,
        p_daily_limit: 1,
      });
      await clientAdmin.rpc("set_family_recipe_analysis_daily_limit", {
        p_family_id: familyF1,
        p_daily_limit: null,
      });
      expect(await limitOf(familyF1)).toBeNull();

      await seedUsage(familyF1, DEFAULT_DAILY_LIMIT - 1);
      expect(await consume(clientA)).toBe(true);
      expect(await consume(clientA)).toBe(false);
    });

    it("負の上限は設定できない", async () => {
      const { error } = await clientAdmin.rpc(
        "set_family_recipe_analysis_daily_limit",
        { p_family_id: familyF1, p_daily_limit: -1 },
      );
      expect(error).not.toBeNull();
      expect(await limitOf(familyF1)).toBeNull();
    });

    it("メンバーは関数でも直接の更新でも自分の家族の上限を変えられない", async () => {
      const { error } = await clientA.rpc(
        "set_family_recipe_analysis_daily_limit",
        { p_family_id: familyF1, p_daily_limit: 999 },
      );
      expect(error?.code).toBe("42501");

      await clientA
        .from("families")
        .update({ recipe_analysis_daily_limit: 999 })
        .eq("id", familyF1);

      expect(await limitOf(familyF1)).toBeNull();
    });
  });
});
