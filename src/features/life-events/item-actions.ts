"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import {
  getAreaPrograms,
  isSeidoDataHubConfigured,
} from "@/features/programs/api";
import { ageInMonths } from "@/features/programs/filter";
import { getFamilyMunicipality } from "@/features/programs/queries";
import type { Attribution } from "@/features/programs/types";
import { todayInJst } from "@/lib/date";
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

export type ActionResult = { ok: true } | { ok: false; error: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const INVALID_INPUT = "入力内容を確認してください";
const ALREADY_RECORDED = "すでに記録されています";

function firstIssue(error: { issues: readonly { message: string }[] }): string {
  return error.issues[0]?.message ?? INVALID_INPUT;
}

/** 自家族の子かを確かめる（RLS でも弾かれるが、分かりやすいエラーにする）。 */
async function ownsChild(
  supabase: Supabase,
  familyId: string,
  childId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

async function findActiveItem(
  supabase: Supabase,
  childId: string,
  catalogKey: string,
) {
  const { data } = await supabase
    .from("life_event_items")
    .select("id, status")
    .eq("child_id", childId)
    .eq("catalog_key", catalogKey)
    .is("deleted_at", null)
    .maybeSingle();
  return data as { id: string; status: "in_task" | "done" } | null;
}

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

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  if (!(await ownsChild(supabase, member.familyId, childId))) {
    return { ok: false, error: "子供が見つかりません" };
  }

  // テンプレはサーバー側のカタログを正とする。制度は呼び出し側の値を使う。
  const template = findCatalogItem(catalogKey);
  const itemTitle = template?.title ?? parsed.data.title;
  const taskTitle = parsed.data.title;
  const note = template?.note ?? null;
  const url = template ? template.url : parsed.data.url || null;

  let itemId: string;
  let createdItem = false;
  const { data: inserted, error: insertError } = await supabase
    .from("life_event_items")
    .insert({
      family_id: member.familyId,
      child_id: childId,
      catalog_key: catalogKey,
      title: itemTitle,
      status: "in_task",
      created_by: member.id,
    })
    .select("id")
    .single();

  if (inserted) {
    itemId = inserted.id;
    createdItem = true;
  } else if (insertError?.code === "23505") {
    // 同時に追加された。先にできた行を使う。
    const existing = await findActiveItem(supabase, childId, catalogKey);
    if (!existing) return { ok: false, error: "タスクへの追加に失敗しました" };
    if (existing.status === "done") {
      return { ok: false, error: ALREADY_RECORDED };
    }
    itemId = existing.id;
  } else {
    return { ok: false, error: "タスクへの追加に失敗しました" };
  }

  const { data: lastTask } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const taskId = crypto.randomUUID();
  const { error } = await supabase.from("tasks").insert({
    id: taskId,
    family_id: member.familyId,
    title: taskTitle,
    note,
    url,
    due_on: dueOn === "" ? null : dueOn,
    is_purchase: false,
    sort_order: (lastTask?.sort_order ?? 0) + 1,
    created_by: member.id,
    life_event_item_id: itemId,
  });

  if (error) {
    if (createdItem) {
      await supabase
        .from("life_event_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", itemId);
    }
    return { ok: false, error: "タスクへの追加に失敗しました" };
  }
  return { ok: true, taskId };
}

export async function recordLifeEventItemDone(input: {
  childId: string;
  catalogKey: string;
  title: string;
  doneOn: string;
}): Promise<ActionResult> {
  const parsed = recordLifeEventItemDoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { childId, catalogKey, doneOn } = parsed.data;

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  if (!(await ownsChild(supabase, member.familyId, childId))) {
    return { ok: false, error: "子供が見つかりません" };
  }

  const title = findCatalogItem(catalogKey)?.title ?? parsed.data.title;
  const failure = "記録に失敗しました";

  const { error: insertError } = await supabase
    .from("life_event_items")
    .insert({
      family_id: member.familyId,
      child_id: childId,
      catalog_key: catalogKey,
      title,
      status: "done",
      done_on: doneOn,
      created_by: member.id,
    });
  if (!insertError) return { ok: true };
  if (insertError.code !== "23505") return { ok: false, error: failure };

  const existing = await findActiveItem(supabase, childId, catalogKey);
  if (!existing) return { ok: false, error: failure };
  if (existing.status === "done") return { ok: false, error: ALREADY_RECORDED };

  // in_task → done。更新条件に状態を入れ、先に別の操作で変わっていたら書き換えない。
  const { data: updated, error: updateError } = await supabase
    .from("life_event_items")
    .update({ status: "done", done_on: doneOn })
    .eq("id", existing.id)
    .eq("status", "in_task")
    .is("deleted_at", null)
    .select("id");
  if (updateError) return { ok: false, error: failure };
  if (!updated || updated.length === 0) {
    return {
      ok: false,
      error: "項目の状態が変わっています。画面を更新してください",
    };
  }

  // 手で付けた記録が、あとのタスク操作で巻き戻らないよう参照を外す。
  const { error: detachError } = await supabase
    .from("tasks")
    .update({ life_event_item_id: null })
    .eq("life_event_item_id", existing.id);
  if (detachError) return { ok: false, error: failure };

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

  if (error) return { ok: false, error: "日付の更新に失敗しました" };
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

  if (error) return { ok: false, error: "メモの更新に失敗しました" };
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

  if (error) return { ok: false, error: "削除に失敗しました" };
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
