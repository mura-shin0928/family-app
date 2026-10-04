"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import type { ActionResult } from "@/lib/action-result";
import { logActionError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import {
  createPurchaseLocationSchema,
  deletePurchaseLocationSchema,
  updatePurchaseLocationSchema,
} from "./schema";

// purchase_locations_family_name_idx（部分unique）違反。
const UNIQUE_VIOLATION = "23505";
const DUPLICATE_NAME_MESSAGE = "同じ名前の場所がすでにあります";

export async function createPurchaseLocation(input: {
  name: string;
}): Promise<ActionResult> {
  const parsed = createPurchaseLocationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase.from("purchase_locations").insert({
    family_id: member.familyId,
    name: parsed.data.name,
    created_by: member.id,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, error: DUPLICATE_NAME_MESSAGE };
    }
    logActionError("createPurchaseLocation", error);
    return { ok: false, error: "登録に失敗しました" };
  }

  return { ok: true };
}

export async function updatePurchaseLocation(input: {
  id: string;
  name: string;
}): Promise<ActionResult> {
  const parsed = updatePurchaseLocationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_locations")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId)
    .select("id");

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, error: DUPLICATE_NAME_MESSAGE };
    }
    logActionError("updatePurchaseLocation", error);
    return { ok: false, error: "更新に失敗しました" };
  }
  if (data.length === 0) {
    return { ok: false, error: "買う場所が見つかりません" };
  }

  return { ok: true };
}

/**
 * 論理削除。children と同じくRLSはupdateだけで完結する（deleteポリシーは無い）。
 * tasks 側の purchase_location_id は消さない — UIで「未知のid = 未設定」として描画する。
 */
export async function deletePurchaseLocation(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = deletePurchaseLocationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("purchase_locations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId);

  if (error) {
    logActionError("deletePurchaseLocation", error);
    return { ok: false, error: "削除に失敗しました" };
  }

  return { ok: true };
}
