"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFamilyMember } from "@/features/auth/guard";
import { INVITATION_TTL_DAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  invitationIdSchema,
} from "./schema";
import { generateInvitationToken, hashInvitationToken } from "./token";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateInvitationResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/** accept_invitation (SQL) の raise exception メッセージ → 画面表示文言。 */
const ACCEPT_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "ログインが必要です",
  email_not_confirmed: "メールアドレスの確認が完了していません",
  invitation_not_found: "招待が見つかりません",
  invitation_revoked: "この招待は取り消されています",
  invitation_already_used: "この招待はすでに使用されています",
  invitation_expired: "この招待の有効期限が切れています",
  invitation_email_mismatch:
    "この招待は別のメールアドレス宛です。招待されたメールアドレスでログインし直してください",
  already_in_another_family:
    "すでに別のFamilyに参加しているため、この招待を受けられません",
};

function mapAcceptErrorMessage(message: string): string {
  return ACCEPT_ERROR_MESSAGES[message] ?? "招待の受諾に失敗しました";
}

/**
 * 招待を発行する。familyId はクライアント入力を信用せず、常に
 * requireFamilyMember() で解決した「自分の所属Family」を使う。
 * DB側のRLS (invitations_insert_own_family) がこれの最終防衛線。
 * 生トークンはこの戻り値でのみ返す — DBにはハッシュしか保存しないため、
 * このレスポンスを逃すと二度と表示できない。
 */
export async function createInvitation(input: {
  email: string;
  displayName: string;
}): Promise<CreateInvitationResult> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const token = generateInvitationToken();
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase.from("invitations").insert({
    family_id: member.familyId,
    token_hash: hashInvitationToken(token),
    invited_email: parsed.data.email,
    display_name: parsed.data.displayName,
    invited_by: member.id,
    expires_at: expiresAt,
  });

  if (error) {
    return { ok: false, error: "招待の作成に失敗しました" };
  }

  revalidatePath("/family");
  return { ok: true, token };
}

export async function revokeInvitation(input: {
  invitationId: string;
}): Promise<ActionResult> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.invitationId)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "取り消しに失敗しました" };
  }

  revalidatePath("/family");
  return { ok: true };
}

/**
 * 招待を受諾する。認可（誤ったFamilyへの参加防止・1回限り・期限）は
 * すべて accept_invitation (security definer SQL関数) が担う — ここは
 * トークンをハッシュ化して渡すだけの薄いラッパー。
 */
export async function acceptInvitation(input: {
  token: string;
}): Promise<ActionResult> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な招待です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.rpc("accept_invitation", {
    p_token_hash: hashInvitationToken(parsed.data.token),
  });

  if (error) {
    return { ok: false, error: mapAcceptErrorMessage(error.message) };
  }

  redirect("/");
}
