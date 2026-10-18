"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFamilyMember } from "@/features/auth/guard";
import type { ActionResult } from "@/lib/action-result";
import { logActionError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { deleteFamilySchema, memberIdSchema } from "./schema";

/**
 * メンバーをFamilyから削除する。family_members 行を消すのみで、
 * auth.users 側は残る（本人のログイン自体は消えず、以後 /no-access に
 * リダイレクトされるだけ）。auth情報ごと消す場合は scripts/admin.mts の
 * remove-member を使う（service_role が要るためアプリ側では行わない）。
 */
export async function removeMember(input: {
  memberId: string;
}): Promise<ActionResult> {
  const parsed = memberIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  if (parsed.data.memberId === member.id) {
    return { ok: false, error: "自分自身は削除できません" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", parsed.data.memberId)
    .eq("family_id", member.familyId);

  if (error) {
    logActionError("removeMember", error);
    return { ok: false, error: "削除に失敗しました" };
  }

  revalidatePath("/family");
  return { ok: true };
}

/** delete_my_family (SQL) の raise exception メッセージ → 画面表示文言。 */
const DELETE_FAMILY_ERROR_MESSAGES: Record<string, string> = {
  family_name_mismatch: "家族名が一致しません",
  family_has_app_admin: "この家族は管理者がいるため退会できません",
};

/**
 * 家族ごと退会する。家族のデータとメンバー全員のログインを消す。
 * 確認と削除は delete_my_family (security definer SQL関数) が担う。
 */
export async function deleteFamily(input: {
  confirmName: string;
}): Promise<ActionResult> {
  const parsed = deleteFamilySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "家族名が一致しません" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_family", {
    p_family_id: member.familyId,
    p_confirm_name: parsed.data.confirmName,
  });

  if (error) {
    const known = DELETE_FAMILY_ERROR_MESSAGES[error.message];
    if (!known) {
      logActionError("deleteFamily", error);
    }
    return { ok: false, error: known ?? "退会に失敗しました" };
  }

  // ユーザーはもう消えているので、Cookie のセッションを消すだけ
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  redirect("/login?deleted=1");
}
