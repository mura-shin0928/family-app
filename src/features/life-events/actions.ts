"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { findLifeEventTemplate } from "./default-templates";
import {
  addLifeEventProcedureSchema,
  addLifeEventProcedureToTaskSchema,
  addLifeEventSchema,
  lifeEventProcedureIdSchema,
  lifeEventProcedureTaskIdSchema,
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
 * その子の手続きリストの先頭 sort_order を返す（項目が無ければ 1）。
 * 先頭に足すときは「これ - 1」を使う。sort_order は 0 や負でも構わない
 * （並べ替えを保存するたびに 1..N へ振り直されて自己修復する）ので、
 * 既存の全項目を押し下げる更新はしない。
 */
async function firstSortOrderForChild(
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
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.sort_order ?? 1;
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

  const startedOn = parsed.data.startedOn === "" ? null : parsed.data.startedOn;

  // その子の同じ種別のライフイベントを再利用する（無ければ作る）。addLifeEventProcedure と
  // 同じ方針 — 「項目を追加」で先に空イベントができていたときに重複して並ばないようにする。
  const { data: existing } = await supabase
    .from("life_events")
    .select("id, started_on")
    .eq("family_id", member.familyId)
    .eq("child_id", parsed.data.childId)
    .eq("kind", template.kind)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let event = existing ? { id: existing.id } : null;
  const createdNew = !existing;

  if (existing) {
    // 基準日が未入力のまま残っているイベントに、今回入力があれば埋める（上書きはしない）。
    if (existing.started_on === null && startedOn !== null) {
      await supabase
        .from("life_events")
        .update({ started_on: startedOn })
        .eq("id", existing.id);
    }
  } else {
    const { data: created, error: eventError } = await supabase
      .from("life_events")
      .insert({
        family_id: member.familyId,
        kind: template.kind,
        child_id: parsed.data.childId,
        started_on: startedOn,
        created_by: member.id,
      })
      .select("id")
      .single();

    if (eventError || !created) {
      return { ok: false, error: "ライフイベントの追加に失敗しました" };
    }
    event = { id: created.id };
  }

  if (!event) {
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
    // 今回このイベントを新規作成したときだけ畳む。項目が1つも入らなかったイベントが
    // 残ると、消す手段が無いままリストに居座る（イベントの削除UIは無い）。
    // 既存イベントを再利用した場合は他の項目がぶら下がっているので消さない。
    if (createdNew) {
      await supabase
        .from("life_events")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", event.id);
    }
    return { ok: false, error: "ライフイベントの追加に失敗しました" };
  }

  return { ok: true };
}

/**
 * 手続きリストに項目を1つ足す。子供とライフイベント種別(kind)で受け取り、その子に
 * その種別のライフイベントがあればそれに、無ければ空で1つ作ってぶら下げる
 * （テンプレの他項目は入れない）。時期の硬さは選ばせず既定（〜ごろ）で入れる。
 * 並び順は position で先頭／末尾（既定は末尾）。手続き画面はリストの上下どちらにも
 * 追加の入口があり、押した側の端に入る。制度一覧からの追加もここを通る
 * （url・行政手続きを付けて末尾に入れる）。
 */
export async function addLifeEventProcedure(input: {
  childId: string;
  kind: string;
  title: string;
  url: string;
  isGovernment: boolean;
  position?: "top" | "bottom";
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

  const sortOrder =
    parsed.data.position === "top"
      ? (await firstSortOrderForChild(
          supabase,
          member.familyId,
          parsed.data.childId,
        )) - 1
      : (await lastSortOrderForChild(
          supabase,
          member.familyId,
          parsed.data.childId,
        )) + 1;

  const { error } = await supabase.from("life_event_procedures").insert({
    family_id: member.familyId,
    life_event_id: lifeEventId,
    child_id: parsed.data.childId,
    sort_order: sortOrder,
    title: parsed.data.title,
    url: parsed.data.url === "" ? null : parsed.data.url,
    is_government: parsed.data.isGovernment,
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

export type AddProcedureToTaskResult =
  | { ok: true; taskId: string }
  | { ok: false; error: string };

/**
 * 手続きの1項目を「やること」に落とす。タイトルと期限は呼び出し側のモーダルで
 * プリセット（項目名 / 目安日）してから編集できるので、確定した値をそのまま受け取る。
 * メモ・URL は項目のものを引き継ぐ。レシピ材料 →「買うもの」と同じ流儀で、追加済みの印は
 * 残さない（同じ項目を何度でもタスク化できる）。Undo 用に作った task の id を返す。
 */
export async function addLifeEventProcedureToTask(input: {
  id: string;
  title: string;
  dueOn: string;
}): Promise<AddProcedureToTaskResult> {
  const parsed = addLifeEventProcedureToTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: procedure } = await supabase
    .from("life_event_procedures")
    .select("id, note, url")
    .eq("id", parsed.data.id)
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!procedure) {
    return { ok: false, error: "項目が見つかりません" };
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
    title: parsed.data.title,
    note: procedure.note,
    url: procedure.url,
    due_on: parsed.data.dueOn === "" ? null : parsed.data.dueOn,
    is_purchase: false,
    sort_order: (lastTask?.sort_order ?? 0) + 1,
    created_by: member.id,
  });

  if (error) {
    return { ok: false, error: "タスクへの追加に失敗しました" };
  }

  return { ok: true, taskId };
}

/**
 * addLifeEventProcedureToTask の取り消し。作ったタスクを論理削除する
 * （undoAddIngredientsToPurchases と同じ）。
 */
export async function undoLifeEventProcedureToTask(input: {
  taskId: string;
}): Promise<ActionResult> {
  const parsed = lifeEventProcedureTaskIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.taskId)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "取り消しに失敗しました" };
  }

  return { ok: true };
}
