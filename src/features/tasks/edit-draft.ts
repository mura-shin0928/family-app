import { addDaysToDateString } from "@/lib/date";
import { updateTaskSchema } from "./schema";
import type { TaskDTO } from "./types";

/** 編集シートの下書き。url/note は入力欄の値そのもの（未設定 = 空文字）。 */
export type TaskDraft = {
  title: string;
  dueOn: string | null;
  isPurchase: boolean;
  purchaseLocationId: string | null;
  url: string;
  note: string;
};

/** updateTask に渡す差分。空文字列 = 未設定。 */
export type TaskUpdatePatch = Partial<{
  title: string;
  dueOn: string;
  isPurchase: boolean;
  purchaseLocationId: string;
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
  if (patch.url !== undefined) fields.url = patch.url || null;
  if (patch.note !== undefined) fields.note = patch.note || null;
  return fields;
}

export type DueChip = "today" | "tomorrow" | "custom" | "none";

/** 期限チップのうち選択状態にする1つ。日付入力を開いている間は「日付を選ぶ」。 */
export function selectedDueChip(
  dueOn: string | null,
  today: string,
  pickerOpen: boolean,
): DueChip {
  if (pickerOpen) return "custom";
  if (dueOn === null) return "none";
  if (dueOn === today) return "today";
  if (dueOn === addDaysToDateString(today, 1)) return "tomorrow";
  return "custom";
}
