"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import {
  createChildSchema,
  deleteChildSchema,
  updateChildSchema,
} from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createChild(input: {
  displayName: string;
  expectedBirthDate: string;
  birthDate: string;
}): Promise<ActionResult> {
  const parsed = createChildSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase.from("children").insert({
    family_id: member.familyId,
    display_name: parsed.data.displayName,
    expected_birth_date:
      parsed.data.expectedBirthDate === ""
        ? null
        : parsed.data.expectedBirthDate,
    birth_date: parsed.data.birthDate === "" ? null : parsed.data.birthDate,
    created_by: member.id,
  });

  if (error) {
    return { ok: false, error: "登録に失敗しました" };
  }

  return { ok: true };
}

export async function updateChild(input: {
  childId: string;
  displayName: string;
  expectedBirthDate: string;
  birthDate: string;
}): Promise<ActionResult> {
  const parsed = updateChildSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("children")
    .update({
      display_name: parsed.data.displayName,
      expected_birth_date:
        parsed.data.expectedBirthDate === ""
          ? null
          : parsed.data.expectedBirthDate,
      birth_date: parsed.data.birthDate === "" ? null : parsed.data.birthDate,
    })
    .eq("id", parsed.data.childId);

  if (error) {
    return { ok: false, error: "更新に失敗しました" };
  }

  return { ok: true };
}

/**
 * 論理削除。childrenのRLSはtasks/recipesと同じくupdateだけで完結する
 * （deleteポリシーは無い）。app_admin等の特別な権限は不要 — 家族なら誰でも可能。
 */
export async function deleteChild(input: {
  childId: string;
}): Promise<ActionResult> {
  const parsed = deleteChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("children")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.childId);

  if (error) {
    return { ok: false, error: "削除に失敗しました" };
  }

  return { ok: true };
}
