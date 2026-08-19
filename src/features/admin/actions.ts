"use server";

import { revalidatePath } from "next/cache";
import { requireAppAdmin } from "@/features/auth/guard";
import type {
  ActionResult,
  CreateInvitationResult,
} from "@/features/invitations/actions";
import {
  createInvitationSchema,
  invitationIdSchema,
  memberIdSchema,
} from "@/features/invitations/schema";
import {
  generateInvitationToken,
  hashInvitationToken,
} from "@/features/invitations/token";
import { INVITATION_TTL_DAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { createFamilySchema, familyIdSchema } from "./schema";

export type CreateFamilyResult =
  | { ok: true; familyId: string }
  | { ok: false; error: string };

/**
 * app_adminがFamilyを新規作成する。RLS (families_insert_admin) が
 * is_app_admin()を要求するため、これの最終防衛線もDB側にある。
 */
export async function createFamily(input: {
  name: string;
}): Promise<CreateFamilyResult> {
  const parsed = createFamilySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireAppAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("families")
    .insert({ name: parsed.data.name })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Familyの作成に失敗しました" };
  }

  revalidatePath("/admin");
  return { ok: true, familyId: data.id };
}

/**
 * app_adminが任意のFamilyへ招待を発行する。invited_by は常にnull
 * （scripts/admin.mtsのcreateInvitationRowと同じ「管理側発行」のセマンティクス）。
 * RLS (invitations_insert_admin) がこれを強制する。
 */
export async function createAdminInvitation(
  familyId: string,
  input: { email: string; displayName: string },
): Promise<CreateInvitationResult> {
  const parsedFamilyId = familyIdSchema.safeParse(familyId);
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsedFamilyId.success || !parsed.success) {
    return {
      ok: false,
      error: parsed.error?.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireAppAdmin();
  const supabase = await createClient();

  const token = generateInvitationToken();
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase.from("invitations").insert({
    family_id: parsedFamilyId.data,
    token_hash: hashInvitationToken(token),
    invited_email: parsed.data.email,
    display_name: parsed.data.displayName,
    invited_by: null,
    expires_at: expiresAt,
  });

  if (error) {
    return { ok: false, error: "招待の作成に失敗しました" };
  }

  revalidatePath(`/admin/families/${parsedFamilyId.data}`);
  return { ok: true, token };
}

export async function revokeAdminInvitation(
  familyId: string,
  input: { invitationId: string },
): Promise<ActionResult> {
  const parsedFamilyId = familyIdSchema.safeParse(familyId);
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsedFamilyId.success || !parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  await requireAppAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.invitationId)
    .eq("family_id", parsedFamilyId.data);

  if (error) {
    return { ok: false, error: "取り消しに失敗しました" };
  }

  revalidatePath(`/admin/families/${parsedFamilyId.data}`);
  return { ok: true };
}

export async function deleteAdminInvitation(
  familyId: string,
  input: { invitationId: string },
): Promise<ActionResult> {
  const parsedFamilyId = familyIdSchema.safeParse(familyId);
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsedFamilyId.success || !parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  await requireAppAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", parsed.data.invitationId)
    .eq("family_id", parsedFamilyId.data);

  if (error) {
    return { ok: false, error: "削除に失敗しました" };
  }

  revalidatePath(`/admin/families/${parsedFamilyId.data}`);
  return { ok: true };
}

/**
 * app_adminが任意のFamilyのメンバーを削除する。familyメンバー自身の
 * removeMember（自分自身は削除できない制約）と違い、adminはそのFamilyの
 * メンバーではないため「自分自身」の概念がない。
 */
export async function removeAdminMember(
  familyId: string,
  input: { memberId: string },
): Promise<ActionResult> {
  const parsedFamilyId = familyIdSchema.safeParse(familyId);
  const parsed = memberIdSchema.safeParse(input);
  if (!parsedFamilyId.success || !parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  await requireAppAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", parsed.data.memberId)
    .eq("family_id", parsedFamilyId.data);

  if (error) {
    return { ok: false, error: "削除に失敗しました" };
  }

  revalidatePath(`/admin/families/${parsedFamilyId.data}`);
  return { ok: true };
}
