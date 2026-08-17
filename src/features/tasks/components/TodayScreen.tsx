"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { SOON_DAYS } from "@/lib/constants";
import { addDaysToDateString, todayInJst } from "@/lib/date";
import {
  createTask,
  deleteTask,
  setTaskDone,
  updateTaskDueDate,
} from "../actions";
import {
  bucketOpenTasks,
  splitOpenAndCompletedToday,
  TASK_BUCKET_ORDER,
  type TaskBucketKey,
} from "../buckets";
import type { TaskDTO } from "../types";
import { QuickCaptureBar } from "./QuickCaptureBar";
import { TaskRow } from "./TaskRow";

const BUCKET_LABEL: Record<TaskBucketKey, string> = {
  overdue: "期限超過",
  today: "今日",
  soon: `そろそろ（〜${SOON_DAYS}日）`,
  later: "期限なし",
};

type Action =
  | { type: "add"; task: TaskDTO }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "dueDate"; id: string; dueOn: string | null }
  | { type: "remove"; id: string };

function applyAction(tasks: TaskDTO[], action: Action): TaskDTO[] {
  switch (action.type) {
    case "add":
      // useOptimistic re-runs this reducer against the latest committed `tasks`
      // whenever it changes mid-transition, so this must stay idempotent or the
      // task added via setTasks below gets appended a second time.
      return tasks.some((task) => task.id === action.task.id)
        ? tasks
        : [...tasks, action.task];
    case "toggle":
      return tasks.map((task) =>
        task.id === action.id
          ? {
              ...task,
              status: action.done ? "done" : "open",
              completedAt: action.done ? new Date().toISOString() : null,
            }
          : task,
      );
    case "dueDate":
      return tasks.map((task) =>
        task.id === action.id ? { ...task, dueOn: action.dueOn } : task,
      );
    case "remove":
      return tasks.filter((task) => task.id !== action.id);
  }
}

type Toast = { message: string; actionLabel?: string; onAction?: () => void };

export function TodayScreen({ initialTasks }: { initialTasks: TaskDTO[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  useEffect(() => setTasks(initialTasks), [initialTasks]);

  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, applyAction);
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(next: Toast) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  const today = todayInJst();
  const { open, completedToday } = splitOpenAndCompletedToday(optimisticTasks);
  const buckets = bucketOpenTasks(open, today);
  const isEmpty = open.length === 0 && completedToday.length === 0;

  function handleCreate(input: {
    title: string;
    due: "none" | "today" | "tomorrow";
    isPurchase: boolean;
  }) {
    const id = crypto.randomUUID();
    const dueOn =
      input.due === "today"
        ? today
        : input.due === "tomorrow"
          ? addDaysToDateString(today, 1)
          : null;
    const optimisticTask: TaskDTO = {
      id,
      title: input.title,
      dueOn,
      isPurchase: input.isPurchase,
      status: "open",
      completedAt: null,
      sortOrder: Number.MAX_SAFE_INTEGER,
    };

    startTransition(async () => {
      applyOptimistic({ type: "add", task: optimisticTask });
      const result = await createTask({ id, ...input });
      if (result.ok) {
        setTasks((prev) =>
          applyAction(prev, { type: "add", task: optimisticTask }),
        );
      } else {
        showToast({ message: result.error });
      }
    });
  }

  function applyToggle(taskId: string, done: boolean) {
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: taskId, done });
      const result = await setTaskDone({ taskId, done });
      if (result.ok) {
        setTasks((prev) =>
          applyAction(prev, { type: "toggle", id: taskId, done }),
        );
        if (done) {
          showToast({
            message: "完了しました",
            actionLabel: "元に戻す",
            onAction: () => applyToggle(taskId, false),
          });
        }
      } else {
        showToast({ message: result.error });
      }
    });
  }

  function handleToggle(task: TaskDTO) {
    applyToggle(task.id, task.status !== "done");
  }

  function handleDueDateChange(task: TaskDTO, dueOn: string | null) {
    startTransition(async () => {
      applyOptimistic({ type: "dueDate", id: task.id, dueOn });
      const result = await updateTaskDueDate({
        taskId: task.id,
        dueOn: dueOn ?? "",
      });
      if (result.ok) {
        setTasks((prev) =>
          applyAction(prev, { type: "dueDate", id: task.id, dueOn }),
        );
      } else {
        showToast({ message: result.error });
      }
    });
  }

  function handleDelete(task: TaskDTO) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: task.id });
      const result = await deleteTask({ taskId: task.id });
      if (result.ok) {
        setTasks((prev) => applyAction(prev, { type: "remove", id: task.id }));
      } else {
        showToast({ message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col pb-40">
      <div className="flex-1 space-y-6 px-4 py-4">
        {TASK_BUCKET_ORDER.filter((key) => key !== "later").map((key) =>
          buckets[key].length > 0 ? (
            <section key={key}>
              <h2 className="mb-2 text-sm font-semibold text-zinc-500">
                {BUCKET_LABEL[key]}（{buckets[key].length}）
              </h2>
              <div className="space-y-2">
                {buckets[key].map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={handleToggle}
                    onDueDateChange={handleDueDateChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ) : null,
        )}

        {buckets.later.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-500">
              {BUCKET_LABEL.later}（{buckets.later.length}）
            </summary>
            <div className="mt-2 space-y-2">
              {buckets.later.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={handleToggle}
                  onDueDateChange={handleDueDateChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </details>
        )}

        {completedToday.length > 0 && (
          <details className="group" open>
            <summary className="cursor-pointer text-sm font-semibold text-zinc-500">
              完了（今日 {completedToday.length}）
            </summary>
            <div className="mt-2 space-y-2">
              {completedToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={handleToggle}
                  onDueDateChange={handleDueDateChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </details>
        )}

        {isEmpty && (
          <p className="py-16 text-center text-sm text-zinc-400">
            今やることはありません。ゆっくりどうぞ。
          </p>
        )}
      </div>

      <QuickCaptureBar onSubmit={handleCreate} />

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-10 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="font-semibold underline underline-offset-2"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
