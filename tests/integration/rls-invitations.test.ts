import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createAnonClient,
  createConfirmedUser,
  deleteUser,
  signInAsClient,
} from "./support/supabase";

const PASSWORD = "Test-Password-123!";

function makeToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

describe("invitations RLS + accept_invitation / invitation_preview", () => {
  const admin = createAdminClient();
  const runId = randomUUID().slice(0, 8);

  let familyF1: string;
  let familyF2: string;
  let memberAId: string; // F1のメンバー
  let memberCId: string; // F2のメンバー

  const userA = { email: `a-${runId}@example.test` };
  const userC = { email: `c-${runId}@example.test` };
  // 招待される側。まだどのFamilyにも属していない。
  const invitee = { email: `invitee-${runId}@example.test` };
  // 招待とは別のメールでログインするユーザー（誤参加防止の確認用）
  const stranger = { email: `stranger-${runId}@example.test` };

  const userIds: Record<string, string> = {};

  beforeAll(async () => {
    const { data: f1, error: f1Error } = await admin
      .from("families")
      .insert({ name: `InvF1-${runId}` })
      .select("id")
      .single();
    if (f1Error || !f1)
      throw new Error(`failed to create F1: ${f1Error?.message}`);
    familyF1 = f1.id;

    const { data: f2, error: f2Error } = await admin
      .from("families")
      .insert({ name: `InvF2-${runId}` })
      .select("id")
      .single();
    if (f2Error || !f2)
      throw new Error(`failed to create F2: ${f2Error?.message}`);
    familyF2 = f2.id;

    const created = await Promise.all([
      createConfirmedUser(admin, userA.email, PASSWORD),
      createConfirmedUser(admin, userC.email, PASSWORD),
      createConfirmedUser(admin, invitee.email, PASSWORD),
      createConfirmedUser(admin, stranger.email, PASSWORD),
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
  });

  afterAll(async () => {
    await admin
      .from("invitations")
      .delete()
      .in("family_id", [familyF1, familyF2]);
    await Promise.all(
      Object.values(userIds).map((id) => deleteUser(admin, id)),
    );
    await admin.from("families").delete().in("id", [familyF1, familyF2]);
  });

  it("a member can create an invitation for their own family", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);
    const { hash } = makeToken();

    const { error } = await clientA.from("invitations").insert({
      family_id: familyF1,
      token_hash: hash,
      invited_email: invitee.email,
      display_name: "招待太郎",
      invited_by: memberAId,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(error).toBeNull();
  });

  it("a member cannot create an invitation for a family they don't belong to", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);
    const { hash } = makeToken();

    const { error } = await clientA.from("invitations").insert({
      family_id: familyF2,
      token_hash: hash,
      invited_email: invitee.email,
      display_name: "なりすまし",
      invited_by: memberAId,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(error).not.toBeNull();
  });

  it("cannot create an invitation with invited_by pointing at another family's member", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);
    const { hash } = makeToken();

    const { error } = await clientA.from("invitations").insert({
      family_id: familyF1,
      token_hash: hash,
      invited_email: invitee.email,
      display_name: "invited_byなりすまし",
      invited_by: memberCId,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(error).not.toBeNull();
  });

  it("cannot create an invitation with expires_at more than 30 days out", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);
    const { hash } = makeToken();

    const { error } = await clientA.from("invitations").insert({
      family_id: familyF1,
      token_hash: hash,
      invited_email: invitee.email,
      display_name: "長すぎる有効期限",
      invited_by: memberAId,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(error).not.toBeNull();
  });

  it("a non-member cannot select another family's invitations", async () => {
    const clientC = await signInAsClient(userC.email, PASSWORD);

    const { data, error } = await clientC
      .from("invitations")
      .select("id")
      .eq("family_id", familyF1);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("anon cannot call accept_invitation or invitation_preview", async () => {
    const anon = createAnonClient();
    const { error: previewError } = await anon.rpc("invitation_preview", {
      p_token_hash: "does-not-matter",
    });
    expect(previewError).not.toBeNull();

    const { error: acceptError } = await anon.rpc("accept_invitation", {
      p_token_hash: "does-not-matter",
    });
    expect(acceptError).not.toBeNull();
  });

  describe("check_invite_email (anon-callable pre-check for the invite email form)", () => {
    it("anon gets ok for a valid invitation and a matching email", async () => {
      const { hash } = makeToken();
      await admin.from("invitations").insert({
        family_id: familyF1,
        token_hash: hash,
        invited_email: invitee.email,
        display_name: "事前確認テスト",
        invited_by: memberAId,
        expires_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      const anon = createAnonClient();
      const { data, error } = await anon
        .rpc("check_invite_email", {
          p_token_hash: hash,
          p_email: invitee.email,
        })
        .single<{ family_name: string; status: string }>();
      expect(error).toBeNull();
      expect(data?.status).toBe("ok");
      expect(data?.family_name).toBeTruthy();
    });

    it("returns email_mismatch for a non-matching email without requiring auth", async () => {
      const { hash } = makeToken();
      await admin.from("invitations").insert({
        family_id: familyF1,
        token_hash: hash,
        invited_email: invitee.email,
        display_name: "不一致テスト",
        invited_by: memberAId,
        expires_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      const anon = createAnonClient();
      const { data, error } = await anon
        .rpc("check_invite_email", {
          p_token_hash: hash,
          p_email: stranger.email,
        })
        .single<{ family_name: string; status: string }>();
      expect(error).toBeNull();
      expect(data?.status).toBe("email_mismatch");
    });

    it("returns not_found for an unknown token", async () => {
      const anon = createAnonClient();
      const { data, error } = await anon
        .rpc("check_invite_email", {
          p_token_hash: "0".repeat(64),
          p_email: invitee.email,
        })
        .single<{ family_name: string; status: string }>();
      expect(error).toBeNull();
      expect(data?.status).toBe("not_found");
    });

    it("is a pure read and never marks the invitation accepted", async () => {
      const { hash } = makeToken();
      const { data: inv } = await admin
        .from("invitations")
        .insert({
          family_id: familyF1,
          token_hash: hash,
          invited_email: invitee.email,
          display_name: "副作用なし確認",
          invited_by: memberAId,
          expires_at: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("id")
        .single();

      const anon = createAnonClient();
      await anon.rpc("check_invite_email", {
        p_token_hash: hash,
        p_email: invitee.email,
      });

      const { data: after } = await admin
        .from("invitations")
        .select("accepted_at")
        .eq("id", inv?.id)
        .single();
      expect(after?.accepted_at).toBeNull();
    });
  });

  describe("accept_invitation", () => {
    it("accepts a valid invitation and adds the invitee to family_members", async () => {
      const { token, hash } = makeToken();
      const { error: insertError } = await admin.from("invitations").insert({
        family_id: familyF1,
        token_hash: hash,
        invited_email: invitee.email,
        display_name: "正常受諾",
        invited_by: memberAId,
        expires_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
      if (insertError) throw new Error(insertError.message);

      const clientInvitee = await signInAsClient(invitee.email, PASSWORD);

      const { data: preview, error: previewError } = await clientInvitee
        .rpc("invitation_preview", { p_token_hash: hash })
        .single<{ family_name: string; status: string }>();
      expect(previewError).toBeNull();
      expect(preview?.status).toBe("ok");

      const { data: familyId, error } = await clientInvitee.rpc(
        "accept_invitation",
        {
          p_token_hash: hash,
        },
      );
      expect(error).toBeNull();
      expect(familyId).toBe(familyF1);

      const { data: memberRow } = await admin
        .from("family_members")
        .select("family_id, display_name")
        .eq("user_id", userIds[invitee.email])
        .single();
      expect(memberRow?.family_id).toBe(familyF1);
      expect(memberRow?.display_name).toBe("正常受諾");

      // 後続テスト（同時受諾を除く）に影響しないよう掃除する
      await admin
        .from("family_members")
        .delete()
        .eq("user_id", userIds[invitee.email]);
      void token; // トークン自体はDBに残らないことの確認用に生成しているだけ
    });

    it("rejects a second acceptance of an already-used invitation", async () => {
      const { hash } = makeToken();
      await admin.from("invitations").insert({
        family_id: familyF1,
        token_hash: hash,
        invited_email: invitee.email,
        display_name: "二重受諾テスト",
        invited_by: memberAId,
        expires_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      const clientInvitee = await signInAsClient(invitee.email, PASSWORD);
      const first = await clientInvitee.rpc("accept_invitation", {
        p_token_hash: hash,
      });
      expect(first.error).toBeNull();

      const second = await clientInvitee.rpc("accept_invitation", {
        p_token_hash: hash,
      });
      expect(second.error).not.toBeNull();

      await admin
        .from("family_members")
        .delete()
        .eq("user_id", userIds[invitee.email]);
    });

    it("rejects an expired invitation", async () => {
      const { hash } = makeToken();
      // expires_at の30日上限・expires_at > created_at はRLSのINSERTにのみかかる
      // （service_roleはbypassする）ため、ここでは意図的に「過去に発行され、
      // すでに期限が切れている」行を service_role で直接作る。
      const { error: insertError } = await admin.from("invitations").insert({
        family_id: familyF1,
        token_hash: hash,
        invited_email: invitee.email,
        display_name: "期限切れ",
        invited_by: memberAId,
        created_at: new Date(Date.now() - 2000).toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(),
      });
      if (insertError) throw new Error(insertError.message);

      const clientInvitee = await signInAsClient(invitee.email, PASSWORD);
      const { error } = await clientInvitee.rpc("accept_invitation", {
        p_token_hash: hash,
      });
      expect(error).not.toBeNull();
      expect(error?.message).toContain("invitation_expired");
    });

    it("rejects a revoked invitation", async () => {
      const { hash } = makeToken();
      const { data: inv } = await admin
        .from("invitations")
        .insert({
          family_id: familyF1,
          token_hash: hash,
          invited_email: invitee.email,
          display_name: "取り消し済み",
          invited_by: memberAId,
          expires_at: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("id")
        .single();
      await admin
        .from("invitations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", inv?.id);

      const clientInvitee = await signInAsClient(invitee.email, PASSWORD);
      const { error } = await clientInvitee.rpc("accept_invitation", {
        p_token_hash: hash,
      });
      expect(error).not.toBeNull();
      expect(error?.message).toContain("invitation_revoked");
    });

    it("rejects when the logged-in email doesn't match the invited email", async () => {
      const { hash } = makeToken();
      await admin.from("invitations").insert({
        family_id: familyF1,
        token_hash: hash,
        invited_email: invitee.email,
        display_name: "宛先違い",
        invited_by: memberAId,
        expires_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      // stranger としてログインし、invitee 宛の招待を受諾しようとする
      const clientStranger = await signInAsClient(stranger.email, PASSWORD);

      const { data: preview } = await clientStranger
        .rpc("invitation_preview", { p_token_hash: hash })
        .single<{ family_name: string; status: string }>();
      expect(preview?.status).toBe("email_mismatch");

      const { error } = await clientStranger.rpc("accept_invitation", {
        p_token_hash: hash,
      });
      expect(error).not.toBeNull();
      expect(error?.message).toContain("invitation_email_mismatch");
    });

    it("rejects acceptance for a user who already belongs to another family", async () => {
      const { hash } = makeToken();
      await admin.from("invitations").insert({
        family_id: familyF1,
        token_hash: hash,
        invited_email: userC.email,
        display_name: "掛け持ち防止",
        invited_by: memberAId,
        expires_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      // userC はすでに familyF2 のメンバー
      const clientC = await signInAsClient(userC.email, PASSWORD);
      const { error } = await clientC.rpc("accept_invitation", {
        p_token_hash: hash,
      });
      expect(error).not.toBeNull();
      expect(error?.message).toContain("already_in_another_family");
    });

    it("invitation_preview reports not_found for an unknown token", async () => {
      const clientA = await signInAsClient(userA.email, PASSWORD);
      const { data: preview } = await clientA
        .rpc("invitation_preview", { p_token_hash: "0".repeat(64) })
        .single<{ family_name: string; status: string }>();
      expect(preview?.status).toBe("not_found");
    });
  });

  it("a member can revoke (but not otherwise edit) their own family's pending invitation", async () => {
    const clientA = await signInAsClient(userA.email, PASSWORD);
    const { hash } = makeToken();
    const { data: inv, error: insertError } = await clientA
      .from("invitations")
      .insert({
        family_id: familyF1,
        token_hash: hash,
        invited_email: invitee.email,
        display_name: "取り消しテスト",
        invited_by: memberAId,
        expires_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    // display_name等、revoked_at以外の列は列権限で拒否される
    const { error: forbiddenColumnError } = await clientA
      .from("invitations")
      .update({ display_name: "改ざん" })
      .eq("id", inv?.id);
    expect(forbiddenColumnError).not.toBeNull();

    const { error: revokeError } = await clientA
      .from("invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inv?.id);
    expect(revokeError).toBeNull();

    const { data: check } = await admin
      .from("invitations")
      .select("revoked_at")
      .eq("id", inv?.id)
      .single();
    expect(check?.revoked_at).not.toBeNull();
  });
});
