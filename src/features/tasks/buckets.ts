import { SOON_DAYS } from "@/lib/constants";
import { type DateString, daysUntil } from "@/lib/date";
import type { TaskDTO } from "./types";

export type TaskBucketKey = "overdue" | "today" | "soon" | "upcoming" | "none";

export const TASK_BUCKET_ORDER: readonly TaskBucketKey[] = [
  "overdue",
  "today",
  "soon",
  "upcoming",
  "none",
];

/**
 * 期限超過 / 今日 / そろそろ（〜soonDays日） / それ以降（期限はあるが先） / 期限なし の5分類。
 * 「期限あり（先）」と「期限なし」は別バケットにする — 期限が付いているタスクを
 * 「期限なし」と表示するのは意味が違う、というフィードバックを受けて分離した。
 * どちらも今日画面では折りたたみ表示（今日画面の役割は「今見るべきもの」に絞ること。
 * それより先の期限はアジェンダ画面(M5)で俯瞰する）。
 */
export function bucketKeyForDueOn(
  dueOn: DateString | null,
  today: DateString,
  soonDays: number = SOON_DAYS,
): TaskBucketKey {
  if (!dueOn) return "none";
  const diff = daysUntil(dueOn, today);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= soonDays) return "soon";
  return "upcoming";
}

export function bucketOpenTasks(
  tasks: readonly TaskDTO[],
  today: DateString,
  soonDays: number = SOON_DAYS,
): Record<TaskBucketKey, TaskDTO[]> {
  const buckets: Record<TaskBucketKey, TaskDTO[]> = {
    overdue: [],
    today: [],
    soon: [],
    upcoming: [],
    none: [],
  };
  for (const task of tasks) {
    buckets[bucketKeyForDueOn(task.dueOn, today, soonDays)].push(task);
  }
  return buckets;
}

/**
 * 今日画面: 未完了(open)タスクと「今日完了したタスク」に分ける。
 * 前日以前に完了したタスクはクエリ側で除外されている前提。
 */
export function splitOpenAndCompletedToday(tasks: readonly TaskDTO[]): {
  open: TaskDTO[];
  completedToday: TaskDTO[];
} {
  const open: TaskDTO[] = [];
  const completedToday: TaskDTO[] = [];
  for (const task of tasks) {
    if (task.status === "open") {
      open.push(task);
    } else {
      completedToday.push(task);
    }
  }
  return { open, completedToday };
}
