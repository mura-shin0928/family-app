"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { findLifeEventTemplate } from "./default-templates";
import {
  addLifeEventProcedureSchema,
  addLifeEventSchema,
  lifeEventProcedureIdSchema,
  reorderLifeEventProceduresSchema,
  updateLifeEventProcedureNoteSchema,
  updateLifeEventProcedureTimingSchema,
  updateLifeEventProcedureTitleSchema,
} from "./schema";
import type { LifeEventKind } from "./types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** その子の手続きリストの末尾 sort_order を返す（項目が無ければ 0）。 */
async function lastSortOrderForChild(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string,
  childId: string,
): Promise<number> {
  const { data } = await supabase
    .from("life_event_procedures")
    .select("sort_order")
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.sort_order ?? 0;
}

/**
 * ライフイベントを1つ足し、そのテンプレートの項目をその子の手続きリストの末尾に
 * コピーする。コピー後はテンプレートと切り離され、家族が自由に編集できる（この
 * 編集済みリストそのものが家族の記録になる）。同じ子に同じ種別を何度でも足せる。
 *
 * 末尾に足すだけで、基準日順に差し込むことはしない — 基準日が未入力のイベントが
 * あると時系列に並べようがないため、初期配置は単純にして並べ替えに委ねる。
 */
export async function addLifeEvent(input: {
  kind: string;
  title: string;
  childId: string;
  startedOn: string;
}): Promise<ActionResult> {
  const parsed = addLifeEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const template = findLifeEventTemplate(parsed.data.kind as LifeEventKind);
  if (!template) {
    return { ok: false, error: "このライフイベントは選べません" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("life_events")
    .insert({
      family_id: member.familyId,
      kind: template.kind,
      title: parsed.data.title,
      child_id: parsed.data.childId,
      started_on: parsed.data.startedOn === "" ? null : parsed.data.startedOn,
      created_by: member.id,
    })
    .select("id")
    .single();

  if (eventError || !event) {
    return { ok: false, error: "ライフイベントの追加に失敗しました" };
  }

  const baseSortOrder = await lastSortOrderForChild(
    supabase,
    member.familyId,
    parsed.data.childId,
  );

  const { error: itemsError } = await supabase
    .from("life_event_procedures")
    .insert(
      template.items.map((item, index) => ({
        family_id: member.familyId,
        life_event_id: event.id,
        child_id: parsed.data.childId,
        sort_order: baseSortOrder + index + 1,
        title: item.title,
        note: item.note,
        is_government: item.isGovernment,
        timing_kind: item.timingKind,
        anchor_event: item.anchorEvent,
        offset_days: item.offsetDays,
      })),
    );

  if (itemsError) {
    // 項目が1つも入らなかったイベントだけが残ると、消す手段が無いまま
    // リストに居座ってしまう（イベントの削除UIは無い）。作りかけを畳んでおく。
    await supabase
      .from("life_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", event.id);
    return { ok: false, error: "ライフイベントの追加に失敗しました" };
  }

  return { ok: true };
}

/**
 * 手続きリストに項目を1つ足す。子供とライフイベント種別(kind)で受け取り、その子に
 * その種別のライフイベントがあればそれに、無ければ空で1つ作ってぶら下げる
 * （テンプレの他項目は入れない）。「誰が決めたか / 時期の硬さ」は選ばせず既定
 * （自分たち・〜ごろ）で入れる。並び順はその子のリストの末尾。
 */
export async function addLifeEventProcedure(input: {
  childId: string;
  kind: string;
  title: string;
}): Promise<ActionResult> {
  const parsed = addLifeEventProcedureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const template = findLifeEventTemplate(parsed.data.kind as LifeEventKind);
  if (!template) {
    return { ok: false, error: "このライフイベントは選べません" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  // RLS でも弾かれるが、他家族／削除済みの子を指したときに分かりやすいエラーを
  // 返すため明示的に確認する。
  const { data: child } = await supabase
    .from("children")
    .select("id")
    .eq("id", parsed.data.childId)
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!child) {
    return { ok: false, error: "子供が見つかりません" };
  }

  // その子の同じ種別のライフイベントを探す（複数あれば直近のもの）。
  const { data: existing } = await supabase
    .from("life_events")
    .select("id")
    .eq("family_id", member.familyId)
    .eq("child_id", parsed.data.childId)
    .eq("kind", template.kind)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lifeEventId = existing?.id as string | undefined;

  if (!lifeEventId) {
    const { data: created, error: createError } = await supabase
      .from("life_events")
      .insert({
        family_id: member.familyId,
        kind: template.kind,
        title: template.title,
        child_id: parsed.data.childId,
        created_by: member.id,
      })
      .select("id")
      .single();
    if (createError || !created) {
      return { ok: false, error: "項目の追加に失敗しました" };
    }
    lifeEventId = created.id;
  }

  const lastSortOrder = await lastSortOrderForChild(
    supabase,
    member.familyId,
    parsed.data.childId,
  );

  const { error } = await supabase.from("life_event_procedures").insert({
    family_id: member.familyId,
    life_event_id: lifeEventId,
    child_id: parsed.data.childId,
    sort_order: lastSortOrder + 1,
    title: parsed.data.title,
    is_government: false,
    timing_kind: "around",
  });

  if (error) {
    return { ok: false, error: "項目の追加に失敗しました" };
  }

  return { ok: true };
}

export async function updateLifeEventProcedureTitle(input: {
  id: string;
  title: string;
}): Promise<ActionResult> {
  const parsed = updateLifeEventProcedureTitleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("life_event_procedures")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "項目名の更新に失敗しました" };
  }

  return { ok: true };
}

export async function updateLifeEventProcedureNote(input: {
  id: string;
  note: string;
}): Promise<ActionResult> {
  const parsed = updateLifeEventProcedureNoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("life_event_procedures")
    .update({ note: parsed.data.note === "" ? null : parsed.data.note })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "メモの更新に失敗しました" };
  }

  return { ok: true };
}

/**
 * 「行政手続きか / 時期の硬さ / 基準日・オフセット」をまとめて更新する（P6-3）。
 * テンプレからコピーした既定値を家族が自分たちのものに直すための編集で、この
 * 編集済みリストそのものが家族の記録になる。
 */
export async function updateLifeEventProcedureTiming(input: {
  id: string;
  isGovernment: boolean;
  timingKind: string;
  anchorEvent: string;
  offsetDays: number | string;
}): Promise<ActionResult> {
  const parsed = updateLifeEventProcedureTimingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  // 基準日を選ばないなら offset も持たせない（片方だけ残ると目安が出せず宙に浮く）。
  const anchorEvent =
    parsed.data.anchorEvent === "" ? null : parsed.data.anchorEvent;
  const offsetDays =
    anchorEvent === null || parsed.data.offsetDays === ""
      ? null
      : parsed.data.offsetDays;

  const { error } = await supabase
    .from("life_event_procedures")
    .update({
      is_government: parsed.data.isGovernment,
      timing_kind: parsed.data.timingKind,
      anchor_event: anchorEvent,
      offset_days: offsetDays,
    })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "時期の更新に失敗しました" };
  }

  return { ok: true };
}

export async function deleteLifeEventProcedure(input: {
  id: string;
}): Promise<ActionResult> {
  const parsed = lifeEventProcedureIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("life_event_procedures")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "削除に失敗しました" };
  }

  return { ok: true };
}

/**
 * ドラッグ&ドロップで並べ替えた結果を保存する。並び順は子供単位で1本なので childId で
 * スコープし、その子の orderedIds を新しい順とみなして sort_order を 1..N に振り直す
 * （隙間や同値があっても自己修復する）。実際に書き換わるのは動いた分だけ。
 *
 * orderedIds がその子の現在の非削除項目の集合とちょうど一致しないときは弾く
 * （送信中に別の家族が項目を足した／消したケース）。呼び出し側で取り直させる。
 */
export async function reorderLifeEventProcedures(input: {
  childId: string;
  orderedIds: string[];
}): Promise<ActionResult> {
  const parsed = reorderLifeEventProceduresSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: rows, error: loadError } = await supabase
    .from("life_event_procedures")
    .select("id, sort_order")
    .eq("family_id", member.familyId)
    .eq("child_id", parsed.data.childId)
    .is("deleted_at", null);

  if (loadError || !rows) {
    return { ok: false, error: "並べ替えに失敗しました" };
  }

  const currentIds = new Set(rows.map((row) => row.id));
  const nextIds = new Set(parsed.data.orderedIds);
  const sameSet =
    currentIds.size === nextIds.size &&
    [...nextIds].every((id) => currentIds.has(id));
  if (!sameSet) {
    return {
      ok: false,
      error: "リストが変わっています。画面を更新してからやり直してください",
    };
  }

  const sortOrderById = new Map(rows.map((row) => [row.id, row.sort_order]));
  const updates = parsed.data.orderedIds
    .map((id, index) => ({ id, sortOrder: index + 1 }))
    .filter(({ id, sortOrder }) => sortOrderById.get(id) !== sortOrder);

  for (const update of updates) {
    const { error } = await supabase
      .from("life_event_procedures")
      .update({ sort_order: update.sortOrder })
      .eq("id", update.id)
      .eq("family_id", member.familyId)
      .eq("child_id", parsed.data.childId);
    if (error) {
      return { ok: false, error: "並べ替えに失敗しました" };
    }
  }

  return { ok: true };
}
