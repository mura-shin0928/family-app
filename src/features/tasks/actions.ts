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

export async function createTask(input: {
  id: string;
  title: string;
  dueOn: string;
  isPurchase: boolean;
  purchaseLocationId: string;
  recordChildId: string;
}): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const location = await resolvePurchaseLocationId(
    supabase,
    parsed.data.purchaseLocationId,
  );
  if (!location.ok) {
    return location;
  }

  const recordChildId = parsed.data.recordChildId;
  if (recordChildId !== "") {
    const { data: child } = await supabase
      .from("children")
      .select("id")
      .eq("id", recordChildId)
      .eq("family_id", member.familyId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!child) {
      return { ok: false, error: "子供が見つかりません" };
    }
  }

  const dueOn = parsed.data.dueOn === "" ? null : parsed.data.dueOn;

  const { data: lastTask } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (lastTask?.sort_order ?? 0) + 1;

  let lifeEventItemId: string | null = null;
  if (recordChildId !== "") {
    const { data: item, error: itemError } = await supabase
      .from("life_event_items")
      .insert({
        family_id: member.familyId,
        child_id: recordChildId,
        catalog_key: null,
        title: parsed.data.title.slice(0, 100),
        status: "in_task",
        created_by: member.id,
      })
      .select("id")
      .single();
    if (itemError || !item) {
      return { ok: false, error: "登録に失敗しました" };
    }
    lifeEventItemId = item.id;
  }

  const { error } = await supabase.from("tasks").insert({
    id: parsed.data.id,
    family_id: member.familyId,
    title: parsed.data.title,
    due_on: dueOn,
    is_purchase: parsed.data.isPurchase,
    purchase_location_id: location.value,
    sort_order: nextSortOrder,
    created_by: member.id,
    life_event_item_id: lifeEventItemId,
  });

  if (error) {
    if (lifeEventItemId) {
      await supabase
        .from("life_event_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", lifeEventItemId);
    }
    return { ok: false, error: "登録に失敗しました" };
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

  const { error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "更新に失敗しました" };
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
