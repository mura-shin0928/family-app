"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import {
  getAreaPrograms,
  isSeidoDataHubConfigured,
} from "@/features/programs/api";
import { ageInMonths } from "@/features/programs/filter";
import { getFamilyMunicipality } from "@/features/programs/queries";
import type { Attribution } from "@/features/programs/types";
import type { ActionResult } from "@/lib/action-result";
import { todayInJst } from "@/lib/date";
import { logActionError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { findCatalogItem } from "./catalog";
import {
  addLifeEventItemToTaskSchema,
  fetchAreaCatalogSchema,
  lifeEventItemIdSchema,
  recordLifeEventItemDoneSchema,
  updateLifeEventItemDoneOnSchema,
  updateLifeEventItemNoteSchema,
} from "./item-schema";
import { programsToCatalog } from "./program-catalog";
import type { CatalogItem } from "./types";

const INVALID_INPUT = "入力内容を確認してください";

function firstIssue(error: { issues: readonly { message: string }[] }): string {
  return error.issues[0]?.message ?? INVALID_INPUT;
}

/** SQL 関数の raise exception メッセージ → 画面表示文言。 */
const ITEM_ERROR_MESSAGES: Record<string, string> = {
  child_not_found: "子供が見つかりません",
  already_recorded: "すでに記録されています",
  item_state_changed: "項目の状態が変わっています。画面を更新してください",
};

export async function addLifeEventItemToTask(input: {
  childId: string;
  catalogKey: string;
  title: string;
  dueOn: string;
  url?: string;
}): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> {
  const parsed = addLifeEventItemToTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { childId, catalogKey, dueOn } = parsed.data;

  await requireFamilyMember();
  const supabase = await createClient();

  // テンプレはサーバー側のカタログを正とする。制度は呼び出し側の値を使う。
  const template = findCatalogItem(catalogKey);
  const url = template ? template.url : parsed.data.url || null;

  const { data: taskId, error } = await supabase.rpc(
    "add_life_event_item_to_task",
    {
      p_child_id: childId,
      p_catalog_key: catalogKey,
      p_item_title: template?.title ?? parsed.data.title,
      p_task_title: parsed.data.title,
      // 制度は記録のメモに公式ページを残す。タスク完了で記録になったときも残る
      p_item_note: (template ? null : url) ?? undefined,
      p_task_note: template?.note ?? undefined,
      p_url: url ?? undefined,
      p_due_on: dueOn || undefined,
    },
  );

  if (error) {
    const known = ITEM_ERROR_MESSAGES[error.message];
    if (!known) {
      logActionError("addLifeEventItemToTask", error);
    }
    return { ok: false, error: known ?? "タスクへの追加に失敗しました" };
  }
  return { ok: true, taskId };
}

export async function recordLifeEventItemDone(input: {
  childId: string;
  catalogKey: string;
  title: string;
  doneOn: string;
  url?: string;
}): Promise<ActionResult> {
  const parsed = recordLifeEventItemDoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { childId, catalogKey, doneOn } = parsed.data;

  await requireFamilyMember();
  const supabase = await createClient();

  const template = findCatalogItem(catalogKey);

  const { error } = await supabase.rpc("record_life_event_item_done", {
    p_child_id: childId,
    p_catalog_key: catalogKey,
    p_title: template?.title ?? parsed.data.title,
    p_done_on: doneOn,
    // 制度は記録のメモに公式ページを残す
    p_note: (template ? null : parsed.data.url) || undefined,
  });

  if (error) {
    const known = ITEM_ERROR_MESSAGES[error.message];
    if (!known) {
      logActionError("recordLifeEventItemDone", error);
    }
    return { ok: false, error: known ?? "記録に失敗しました" };
  }
  return { ok: true };
}

export async function updateLifeEventItemDoneOn(input: {
  id: string;
  doneOn: string;
}): Promise<ActionResult> {
  const parsed = updateLifeEventItemDoneOnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("life_event_items")
    .update({ done_on: parsed.data.doneOn })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId)
    .eq("status", "done")
    .is("deleted_at", null)
    .select("id");

  if (error) {
    logActionError("updateLifeEventItemDoneOn", error);
    return { ok: false, error: "日付の更新に失敗しました" };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "項目の状態が変わっています。画面を更新してください",
    };
  }
  return { ok: true };
}

export async function updateLifeEventItemNote(input: {
  id: string;
  note: string;
}): Promise<ActionResult> {
  const parsed = updateLifeEventItemNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("life_event_items")
    .update({ note: parsed.data.note === "" ? null : parsed.data.note })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId)
    .is("deleted_at", null);

  if (error) {
    logActionError("updateLifeEventItemNote", error);
    return { ok: false, error: "メモの更新に失敗しました" };
  }
  return { ok: true };
}

export async function removeLifeEventItem(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = lifeEventItemIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "不正な操作です" };

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("life_event_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId);

  if (error) {
    logActionError("removeLifeEventItem", error);
    return { ok: false, error: "削除に失敗しました" };
  }
  return { ok: true };
}

export type AreaCatalogResult =
  | {
      ok: true;
      municipalityName: string;
      items: CatalogItem[];
      attribution: Attribution;
    }
  | { ok: false; reason: "not_configured" | "no_municipality" | "error" };

/** 家族の自治体の制度を、子の月齢で絞ってカタログ項目にして返す。 */
export async function fetchAreaCatalog(input: {
  childId: string;
}): Promise<AreaCatalogResult> {
  const parsed = fetchAreaCatalogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "error" };

  if (!isSeidoDataHubConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("children")
    .select("birth_date")
    .eq("id", parsed.data.childId)
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!child) return { ok: false, reason: "error" };

  let municipality: Awaited<ReturnType<typeof getFamilyMunicipality>>;
  try {
    municipality = await getFamilyMunicipality(member.familyId);
  } catch {
    return { ok: false, reason: "error" };
  }
  if (!municipality) return { ok: false, reason: "no_municipality" };

  const result = await getAreaPrograms(municipality.code);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason === "not-configured" ? "not_configured" : "error",
    };
  }

  const ageMonths = child.birth_date
    ? ageInMonths(child.birth_date, todayInJst())
    : null;

  return {
    ok: true,
    municipalityName: municipality.name,
    items: programsToCatalog(result.data, ageMonths),
    attribution: result.attribution,
  };
}
