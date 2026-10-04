"use server";

import { revalidatePath } from "next/cache";
import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import type { TaskUpdatePatch } from "./edit-draft";
import {
  createTaskSchema,
  taskIdSchema,
  toggleDoneSchema,
  updateTaskSchema,
} from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * 買う場所idが自家族のものか（かつ論理削除されていないか）を1クエリで確認する。
 * RLS により他家族の行は返らないので、id 一致 + deleted_at is null だけ見れば足りる。
 * 空文字列は「未設定」なので null を返し、チェックはしない。
 */
async function resolvePurchaseLocationId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raw: string,
): Promise<{ ok: true; value: string | null } | { ok: false; error: string }> {
  if (raw === "") {
    return { ok: true, value: null };
  }

  const { data, error } = await supabase
    .from("purchase_locations")
    .select("id")
    .eq("id", raw)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "指定した買う場所が見つかりません" };
  }

  return { ok: true, value: data.id };
}

/**
 * ライフイベント項目につながるタスクの完了・削除は、トリガーで項目の状態も変わる。
 * ライフイベント画面のクライアントキャッシュ（staleTimes）に古い状態が残らないよう捨てる。
 */
function revalidateLifeEventsIfLinked(
  rows: { life_event_item_id: string | null }[] | null,
) {
  if (rows?.some((row) => row.life_event_item_id !== null)) {
    revalidatePath("/life-events");
  }
}

/** create_task (SQL) の raise exception メッセージ → 画面表示文言。 */
const CREATE_TASK_ERROR_MESSAGES: Record<string, string> = {
  purchase_location_not_found: "指定した買う場所が見つかりません",
  child_not_found: "子供が見つかりません",
};

export async function createTask(input: {
  id: string;
  title: string;
  dueOn: string;
  isPurchase: boolean;
  purchaseLocationId: string;
  recordChildId: string;
  url?: string;
  note?: string;
}): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  // 空文字列 = 未設定。関数側の default null に任せる。
  const { error } = await supabase.rpc("create_task", {
    p_id: parsed.data.id,
    p_title: parsed.data.title,
    p_is_purchase: parsed.data.isPurchase,
    p_due_on: parsed.data.dueOn || undefined,
    p_purchase_location_id: parsed.data.purchaseLocationId || undefined,
    p_record_child_id: parsed.data.recordChildId || undefined,
    p_url: parsed.data.url || undefined,
    p_note: parsed.data.note || undefined,
  });

  if (error) {
    return {
      ok: false,
      error: CREATE_TASK_ERROR_MESSAGES[error.message] ?? "登録に失敗しました",
    };
  }

  return { ok: true };
}

export async function setTaskDone(input: {
  taskId: string;
  done: boolean;
}): Promise<ActionResult> {
  const parsed = toggleDoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(
      parsed.data.done
        ? {
            status: "done",
            completed_at: new Date().toISOString(),
            completed_by: member.id,
          }
        : { status: "open", completed_at: null, completed_by: null },
    )
    .eq("id", parsed.data.taskId)
    .eq("family_id", member.familyId)
    .select("life_event_item_id");

  if (error) {
    return { ok: false, error: "更新に失敗しました" };
  }

  revalidateLifeEventsIfLinked(data);
  return { ok: true };
}

export async function updateTask(
  input: { taskId: string } & TaskUpdatePatch,
): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { taskId, title, dueOn, isPurchase, purchaseLocationId, url, note } =
    parsed.data;
  const update: {
    title?: string;
    due_on?: string | null;
    is_purchase?: boolean;
    purchase_location_id?: string | null;
    url?: string | null;
    note?: string | null;
  } = {};
  if (title !== undefined) update.title = title;
  if (dueOn !== undefined) update.due_on = dueOn || null;
  if (isPurchase !== undefined) update.is_purchase = isPurchase;
  if (url !== undefined) update.url = url || null;
  if (note !== undefined) update.note = note || null;

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  if (purchaseLocationId !== undefined) {
    const location = await resolvePurchaseLocationId(
      supabase,
      purchaseLocationId,
    );
    if (!location.ok) {
      return location;
    }
    update.purchase_location_id = location.value;
  }

  if (Object.keys(update).length === 0) {
    return { ok: true };
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    return { ok: false, error: "更新に失敗しました" };
  }
  if (data.length === 0) {
    return { ok: false, error: "タスクが見つかりません" };
  }

  return { ok: true };
}

export async function deleteTask(input: {
  taskId: string;
}): Promise<ActionResult> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.taskId)
    .eq("family_id", member.familyId)
    .select("life_event_item_id");

  if (error) {
    return { ok: false, error: "削除に失敗しました" };
  }

  revalidateLifeEventsIfLinked(data);
  return { ok: true };
}
