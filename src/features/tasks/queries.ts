import "server-only";
import { startOfTodayJstUtc } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { TaskDTO } from "./types";

/**
 * familyの未完了タスク全件 + 「今日JSTで完了した」done タスクのみ（前日以前の完了は除外）を
 * 1クエリで取得する。期限による絞り込みは行わない — 「今日画面」に限らず、この家族が
 * 今アクセス可能な全タスクの一覧がこの関数の責務。緊急度によるバケット分けは
 * 呼び出し側（サーバ側の純関数、buckets.ts）で行う。
 */
export async function getTasks(familyId: string): Promise<TaskDTO[]> {
  const supabase = await createClient();
  const cutoff = startOfTodayJstUtc().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, title, due_on, is_purchase, status, completed_at, sort_order, url, note",
    )
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .or(`status.eq.open,and(status.eq.done,completed_at.gte.${cutoff})`)
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`failed to load tasks: ${error.message}`);
  }

  return (data ?? []).map(
    (row): TaskDTO => ({
      id: row.id,
      title: row.title,
      dueOn: row.due_on,
      isPurchase: row.is_purchase,
      status: row.status as TaskDTO["status"],
      completedAt: row.completed_at,
      sortOrder: row.sort_order,
      url: row.url,
      note: row.note,
    }),
  );
}
