import type { TaskDTO } from "./types";

/** 一覧のキャッシュに先に反映する操作。 */
export type TaskAction =
  | { type: "add"; task: TaskDTO }
  // now は完了にしたときの completedAt（ISO 文字列）。
  | { type: "toggle"; id: string; done: boolean; now: string }
  | { type: "update"; id: string; fields: Partial<TaskDTO> }
  | { type: "remove"; id: string };

/** createTask に渡す入力。空文字列 = 未設定。 */
export type CreateTaskInput = {
  id: string;
  title: string;
  dueOn: string;
  isPurchase: boolean;
  purchaseLocationId: string;
  recordChildId: string;
};

export function applyTaskAction(
  tasks: TaskDTO[],
  action: TaskAction,
): TaskDTO[] {
  switch (action.type) {
    case "add":
      return [...tasks, action.task];
    case "toggle":
      return tasks.map((task) =>
        task.id === action.id
          ? {
              ...task,
              status: action.done ? "done" : "open",
              completedAt: action.done ? action.now : null,
            }
          : task,
      );
    case "update":
      return tasks.map((task) =>
        task.id === action.id ? { ...task, ...action.fields } : task,
      );
    case "remove":
      return tasks.filter((task) => task.id !== action.id);
  }
}

/** サーバーの採番を待たずに一覧へ出すタスク。並び順は末尾に置く。 */
export function optimisticTaskFromCreateInput(input: CreateTaskInput): TaskDTO {
  return {
    id: input.id,
    title: input.title,
    dueOn: input.dueOn === "" ? null : input.dueOn,
    isPurchase: input.isPurchase,
    status: "open",
    completedAt: null,
    sortOrder: Number.MAX_SAFE_INTEGER,
    url: null,
    note: null,
    purchaseLocationId:
      input.purchaseLocationId === "" ? null : input.purchaseLocationId,
    recordChildId: input.recordChildId === "" ? null : input.recordChildId,
  };
}
