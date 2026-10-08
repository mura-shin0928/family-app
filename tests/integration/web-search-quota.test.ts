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
const DAILY_LIMIT = 20;

describe("Web 検索の利用枠", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let clientC: SupabaseClient;
  let clientOutsider: SupabaseClient;

  const emailA = `wa-${runId}@example.test`;
  const emailB = `wb-${runId}@example.test`;
  const emailC = `wc-${runId}@example.test`;
  const emailOutsider = `wo-${runId}@example.test`;
  const userIds: string[] = [];

  beforeAll(async () => {
    const { data: families, error: familiesError } = await admin
      .from("families")
      .insert([
        { name: `WebQuotaF1-${runId}` },
        { name: `WebQuotaF2-${runId}` },
      ])
      .select("id, name");
    if (familiesError || !families)
      throw new Error(`failed to create families: ${familiesError?.message}`);
    familyF1 = families.find((f) => f.name.startsWith("WebQuotaF1"))?.id;
    familyF2 = families.find((f) => f.name.startsWith("WebQuotaF2"))?.id;

    const [a, b, c, outsider] = await Promise.all([
      createConfirmedUser(admin, emailA, PASSWORD),
      createConfirmedUser(admin, emailB, PASSWORD),
      createConfirmedUser(admin, emailC, PASSWORD),
      createConfirmedUser(admin, emailOutsider, PASSWORD),
    ]);
    userIds.push(a.id, b.id, c.id, outsider.id);

    const { error: membersError } = await admin.from("family_members").insert([
      { family_id: familyF1, user_id: a.id, display_name: "A" },
      { family_id: familyF1, user_id: b.id, display_name: "B" },
      { family_id: familyF2, user_id: c.id, display_name: "C" },
    ]);
    if (membersError)
      throw new Error(`failed to seed members: ${membersError.message}`);

    [clientA, clientB, clientC, clientOutsider] = await Promise.all([
      signInAsClient(emailA, PASSWORD),
      signInAsClient(emailB, PASSWORD),
      signInAsClient(emailC, PASSWORD),
      signInAsClient(emailOutsider, PASSWORD),
    ]);
  });

  beforeEach(async () => {
    await admin
      .from("web_search_usage")
      .delete()
      .in("family_id", [familyF1, familyF2]);
  });

  afterAll(async () => {
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
    await Promise.all(userIds.map((id) => deleteUser(admin, id)));
  });

  async function consume(client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client.rpc("consume_web_search_quota");
    if (error) throw new Error(error.message);
    return data;
  }

  async function usageOf(familyId: string) {
    const { data, error } = await admin
      .from("web_search_usage")
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
        .from("web_search_usage")
        .upsert({ family_id: familyId, day, count });
      if (error) throw new Error(error.message);
      return;
    }
    // 関数と同じ「今日」を得るため、1回使わせてから回数だけ書き換える。
    await consume(familyId === familyF1 ? clientA : clientC);
    const { error } = await admin
      .from("web_search_usage")
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
    await seedUsage(familyF1, DAILY_LIMIT - 1);

    expect(await consume(clientA)).toBe(true);
    expect(await consume(clientA)).toBe(false);
    expect(await consume(clientB)).toBe(false);

    expect((await usageOf(familyF1))?.count).toBe(DAILY_LIMIT);
  });

  it("同時に呼んでも上限を超えない", async () => {
    await seedUsage(familyF1, DAILY_LIMIT - 2);

    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => consume(i % 2 ? clientA : clientB)),
    );

    expect(results.filter(Boolean)).toHaveLength(2);
    expect((await usageOf(familyF1))?.count).toBe(DAILY_LIMIT);
  });

  it("ある家族が上限に達しても、別の家族は使える", async () => {
    await seedUsage(familyF1, DAILY_LIMIT);

    expect(await consume(clientA)).toBe(false);
    expect(await consume(clientC)).toBe(true);
    expect((await usageOf(familyF2))?.count).toBe(1);
  });

  it("日付が変わると回数が1から数え直される", async () => {
    await seedUsage(familyF1, DAILY_LIMIT, "2000-01-01");

    expect(await consume(clientA)).toBe(true);

    const usage = await usageOf(familyF1);
    expect(usage?.count).toBe(1);
    expect(usage?.day).not.toBe("2000-01-01");
  });

  it("家族に所属していないユーザーは使えない", async () => {
    const { error } = await clientOutsider.rpc("consume_web_search_quota");
    expect(error?.code).toBe("42501");
  });

  it("メンバーは回数の行を直接読めず、書き換えも削除もできない", async () => {
    await seedUsage(familyF1, DAILY_LIMIT);

    const { data: rows } = await clientA
      .from("web_search_usage")
      .select("family_id");
    expect(rows ?? []).toEqual([]);

    await clientA
      .from("web_search_usage")
      .update({ count: 1 })
      .eq("family_id", familyF1);
    await clientA.from("web_search_usage").delete().eq("family_id", familyF1);
    const { error: insertError } = await clientA
      .from("web_search_usage")
      .insert({ family_id: familyF1, day: "2000-01-01", count: 1 });
    expect(insertError).not.toBeNull();

    expect((await usageOf(familyF1))?.count).toBe(DAILY_LIMIT);
    expect(await consume(clientA)).toBe(false);
  });
});
