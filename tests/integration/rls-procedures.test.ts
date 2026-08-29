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

describe("procedures / children RLS", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string;
  let memberBId: string;
  let procDraft: string;
  let procPublished: string;
  let procArchived: string;
  let childF1: string;

  const userA = { email: `pa-${runId}@example.test` };
  const userB = { email: `pb-${runId}@example.test` };
  const userC = { email: `pc-${runId}@example.test` };
  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `ProceduresF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `ProceduresF2-${runId}` })
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

    const { data: pd, error: pdError } = await admin
      .from("procedures")
      .insert({
        title: "出生届（未確認）",
        summary: "子が生まれたときに提出する届出です。",
        status: "draft",
        obligation: "unknown",
        deadline_kind: "unknown",
        source_url: `https://example.test/koganei/${runId}/draft`,
        source_title: "出生届",
        fetched_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (pdError || !pd)
      throw new Error(`failed to seed draft procedure: ${pdError?.message}`);
    procDraft = pd.id;

    const { data: pp, error: ppError } = await admin
      .from("procedures")
      .insert({
        title: "児童手当（確認済み）",
        summary: "児童を養育している方に支給される手当です。",
        status: "published",
        obligation: "conditional",
        obligation_quote: "対象の方は申請してください",
        deadline_kind: "none",
        source_url: `https://example.test/koganei/${runId}/published`,
        source_title: "児童手当",
        fetched_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        verified_by: userIds[userA.email],
      })
      .select("id")
      .single();
    if (ppError || !pp)
      throw new Error(
        `failed to seed published procedure: ${ppError?.message}`,
      );
    procPublished = pp.id;

    const { data: pa, error: paError } = await admin
      .from("procedures")
      .insert({
        title: "廃止済みの制度",
        summary: "もう存在しない制度です。",
        status: "archived",
        obligation: "unknown",
        deadline_kind: "unknown",
        source_url: `https://example.test/koganei/${runId}/archived`,
        source_title: "廃止済み",
        fetched_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (paError || !pa)
      throw new Error(`failed to seed archived procedure: ${paError?.message}`);
    procArchived = pa.id;

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
    await admin
      .from("procedures")
      .delete()
      .in("id", [procDraft, procPublished, procArchived]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  describe("procedures", () => {
    it("any family member can select draft and published procedures (global catalog)", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("procedures")
        .select("id, status")
        .in("id", [procDraft, procPublished]);
      expect(error).toBeNull();
      expect(data?.map((p) => p.id).sort()).toEqual(
        [procDraft, procPublished].sort(),
      );
    });

    it("archived procedures are hidden from the select policy", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("procedures")
        .select("id")
        .eq("id", procArchived);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("an unauthenticated client sees no procedures", async () => {
      const anon = createAnonClient();
      const { data, error } = await anon
        .from("procedures")
        .select("id")
        .eq("id", procPublished);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("a family member can insert a new draft procedure (ingest)", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { data, error } = await clientA
        .from("procedures")
        .insert({
          title: "妊婦健診",
          summary: "妊婦健康診査を公費で受けられる制度です。",
          status: "draft",
          obligation: "unknown",
          deadline_kind: "unknown",
          source_url: `https://example.test/koganei/${runId}/insert-ok`,
          source_title: "妊婦健診",
          fetched_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();

      await admin
        .from("procedures")
        .delete()
        .eq("id", data?.id ?? "");
    });

    it("cannot insert a procedure directly as published", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("procedures").insert({
        title: "抜け道公開",
        summary: "確認を経ずに公開しようとするテスト",
        status: "published",
        obligation: "unknown",
        deadline_kind: "unknown",
        source_url: `https://example.test/koganei/${runId}/insert-published`,
        source_title: "抜け道",
        fetched_at: new Date().toISOString(),
      });

      expect(error).not.toBeNull();
    });

    it("cannot insert a draft that already carries verified_at/verified_by", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA.from("procedures").insert({
        title: "確認済み偽装",
        summary: "取り込み経路でverified_atを埋めようとするテスト",
        status: "draft",
        obligation: "unknown",
        deadline_kind: "unknown",
        source_url: `https://example.test/koganei/${runId}/insert-verified`,
        source_title: "確認済み偽装",
        fetched_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      });

      expect(error).not.toBeNull();
    });

    it("any family member can verify (publish) a draft procedure, even from a different family", async () => {
      const { data: seeded, error: seedError } = await admin
        .from("procedures")
        .insert({
          title: "確認対象の制度",
          summary: "確認ボタンのテスト用。",
          status: "draft",
          obligation: "required",
          obligation_quote: "本文中の該当引用を10文字以上で用意しておく",
          deadline_kind: "none",
          source_url: `https://example.test/koganei/${runId}/to-verify`,
          source_title: "確認対象の制度",
          fetched_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (seedError || !seeded)
        throw new Error(`failed to seed: ${seedError?.message}`);

      // familyF2 のメンバーでも、グローバルカタログなので確認できる
      const clientC = await signInAsClient(userC.email, PASSWORD);
      const { error } = await clientC
        .from("procedures")
        .update({
          status: "published",
          verified_at: new Date().toISOString(),
          verified_by: userIds[userC.email],
        })
        .eq("id", seeded.id);
      expect(error).toBeNull();

      const { data: check } = await admin
        .from("procedures")
        .select("status, verified_by")
        .eq("id", seeded.id)
        .single();
      expect(check?.status).toBe("published");
      expect(check?.verified_by).toBe(userIds[userC.email]);

      await admin.from("procedures").delete().eq("id", seeded.id);
    });

    it("cannot set verified_by to someone else's user id", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      // procDraft自体はUSING句（家族のどこかに所属していれば真）を満たすため、
      // ここではWITH CHECK違反として明示的なRLSエラーになる
      // （他家族の行を更新しようとして0件になる他のケースとは挙動が異なる）。
      const { error } = await clientA
        .from("procedures")
        .update({
          status: "published",
          verified_at: new Date().toISOString(),
          verified_by: userIds[userB.email],
        })
        .eq("id", procDraft)
        .select("id");

      expect(error).not.toBeNull();

      const { data: check } = await admin
        .from("procedures")
        .select("status")
        .eq("id", procDraft)
        .single();
      expect(check?.status).toBe("draft");
    });

    it("cannot update columns outside the verification set (e.g. title)", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA
        .from("procedures")
        .update({ title: "改ざん" })
        .eq("id", procPublished);

      expect(error).not.toBeNull();

      const { data: check } = await admin
        .from("procedures")
        .select("title")
        .eq("id", procPublished)
        .single();
      expect(check?.title).toBe("児童手当（確認済み）");
    });

    it("no client can hard-delete a procedure (no delete policy)", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);

      const { error } = await clientA
        .from("procedures")
        .delete()
        .eq("id", procPublished);
      expect(error).not.toBeNull();
    });
  });

  describe("children", () => {
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
});
