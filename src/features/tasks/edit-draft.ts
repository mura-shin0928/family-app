import { addDaysToDateString } from "@/lib/date";
import { updateTaskSchema } from "./schema";
import type { TaskDTO } from "./types";

/** 編集シートの下書き。url/note は入力欄の値そのもの（未設定 = 空文字）。 */
export type TaskDraft = {
  title: string;
  dueOn: string | null;
  isPurchase: boolean;
  purchaseLocationId: string | null;
  recordChildId: string | null;
  url: string;
  note: string;
};

/** updateTask に渡す差分。空文字列 = 未設定。 */
export type TaskUpdatePatch = Partial<{
  title: string;
  dueOn: string;
  isPurchase: boolean;
  purchaseLocationId: string;
  recordChildId: string;
  url: string;
  note: string;
}>;

export type TaskDraftErrors = Partial<Record<"title" | "url" | "note", string>>;

export function draftFromTask(task: TaskDTO): TaskDraft {
  return {
    title: task.title,
    dueOn: task.dueOn,
    isPurchase: task.isPurchase,
    purchaseLocationId: task.purchaseLocationId,
    recordChildId: task.recordChildId,
    url: task.url ?? "",
    note: task.note ?? "",
  };
}

/**
 * 開いた時点の下書きから変わった項目だけを返す。
 * 他の人が同時に変えた項目を保存で上書きしないため、全項目は送らない。
 */
export function buildTaskPatch(
  original: TaskDraft,
  draft: TaskDraft,
): TaskUpdatePatch {
  const patch: TaskUpdatePatch = {};
  const title = draft.title.trim();
  if (title !== original.title.trim()) patch.title = title;
  if (draft.dueOn !== original.dueOn) patch.dueOn = draft.dueOn ?? "";
  if (draft.isPurchase !== original.isPurchase) {
    patch.isPurchase = draft.isPurchase;
  }
  if (draft.purchaseLocationId !== original.purchaseLocationId) {
    patch.purchaseLocationId = draft.purchaseLocationId ?? "";
  }
  if (draft.recordChildId !== original.recordChildId) {
    patch.recordChildId = draft.recordChildId ?? "";
  }
  const url = draft.url.trim();
  if (url !== original.url.trim()) patch.url = url;
  const note = draft.note.trim();
  if (note !== original.note.trim()) patch.note = note;
  return patch;
}

export function isDraftDirty(original: TaskDraft, draft: TaskDraft): boolean {
  return Object.keys(buildTaskPatch(original, draft)).length > 0;
}

export function validateTaskPatch(
  taskId: string,
  patch: TaskUpdatePatch,
): { ok: true } | { ok: false; errors: TaskDraftErrors } {
  const parsed = updateTaskSchema.safeParse({ taskId, ...patch });
  if (parsed.success) return { ok: true };
  const errors: TaskDraftErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (
      (field === "title" || field === "url" || field === "note") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}

/** 楽観更新用に、差分を TaskDTO の形（未設定 = null）へ戻す。 */
export function patchToTaskFields(patch: TaskUpdatePatch): Partial<TaskDTO> {
  const fields: Partial<TaskDTO> = {};
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.dueOn !== undefined) fields.dueOn = patch.dueOn || null;
  if (patch.isPurchase !== undefined) fields.isPurchase = patch.isPurchase;
  if (patch.purchaseLocationId !== undefined) {
    fields.purchaseLocationId = patch.purchaseLocationId || null;
  }
  if (patch.recordChildId !== undefined) {
    fields.recordChildId = patch.recordChildId || null;
  }
  if (patch.url !== undefined) fields.url = patch.url || null;
  if (patch.note !== undefined) fields.note = patch.note || null;
  return fields;
}

/** 期限チップのラベル。チップが横に伸びないよう、日付は M/D で出す。 */
export function dueChipLabel(dueOn: string | null, today: string): string {
  if (dueOn === null) return "期限";
  if (dueOn === today) return "今日";
  if (dueOn === addDaysToDateString(today, 1)) return "明日";
  return `${Number(dueOn.slice(5, 7))}/${Number(dueOn.slice(8, 10))}`;
}
