"use server";

import { revalidatePath } from "next/cache";
import { requireFamilyMember } from "@/features/auth/guard";
import type { ActionResult } from "@/lib/action-result";
import { logActionError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { memberIdSchema } from "./schema";

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
