"use client";

import { useState } from "react";
import { formatRelativeDue } from "@/lib/date";
import type { TaskDTO } from "../types";

type Props = {
  task: TaskDTO;
  today: string;
  onToggle: (task: TaskDTO) => void;
  onDueDateChange: (task: TaskDTO, dueOn: string | null) => void;
  onPurchaseToggle: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
};

export function TaskRow({
  task,
  today,
  onToggle,
  onDueDateChange,
  onPurchaseToggle,
  onDelete,
}: Props) {
  const [editingDue, setEditingDue] = useState(false);
  const done = task.status === "done";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-pressed={done}
        aria-label={done ? "未完了に戻す" : "完了にする"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-zinc-300 dark:border-zinc-600"
        }`}
      >
        {done && "✓"}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${done ? "text-zinc-400 line-through" : ""}`}
        >
          {task.title}
        </p>

        {editingDue ? (
          <div className="mt-1 flex items-center gap-2">
            <input
              type="date"
              defaultValue={task.dueOn ?? ""}
              onBlur={() => setEditingDue(false)}
              onChange={(event) => {
                onDueDateChange(task, event.target.value || null);
                setEditingDue(false);
              }}
              className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-black"
            />
            {task.dueOn && (
              <button
                type="button"
                onClick={() => {
                  onDueDateChange(task, null);
                  setEditingDue(false);
                }}
                className="text-xs text-zinc-400 underline"
              >
                期限なしにする
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDue(true)}
            className="mt-0.5 text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            {task.dueOn ? formatRelativeDue(task.dueOn, today) : "期限を設定"}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onPurchaseToggle(task)}
        aria-pressed={task.isPurchase}
        aria-label={task.isPurchase ? "買うものから外す" : "買うものにする"}
        className={`shrink-0 rounded-full border px-2 py-1 text-xs ${
          task.isPurchase
            ? "border-amber-500 bg-amber-500 text-white"
            : "border-zinc-300 text-zinc-300 dark:border-zinc-600 dark:text-zinc-600"
        }`}
      >
        🛒
      </button>

      <button
        type="button"
        onClick={() => onDelete(task)}
        aria-label="削除"
        className="shrink-0 px-1 text-zinc-300 hover:text-red-500 dark:text-zinc-600"
      >
        ✕
      </button>
    </div>
  );
}
