"use client";

import { type FormEvent, useId, useState } from "react";
import { addDaysToDateString, todayInJst } from "@/lib/date";
import { Chip } from "./Chip";

type Props = {
  onSubmit: (input: {
    title: string;
    dueOn: string | null;
    isPurchase: boolean;
  }) => void;
};

/**
 * 常設Quick Captureバー。タイトルだけで登録が完了する。
 * 「期限」チップをタップすると、今日/明日のワンタップ選択とカレンダーからの
 * 任意選択をまとめたパネルが開く（タグUIは意図的に置かない）。
 */
export function QuickCaptureBar({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState<string | null>(null);
  const [isPurchase, setIsPurchase] = useState(false);
  const [showDuePanel, setShowDuePanel] = useState(false);
  const inputId = useId();

  const today = todayInJst();
  const tomorrow = addDaysToDateString(today, 1);
  const dueLabel =
    dueOn === today ? "今日" : dueOn === tomorrow ? "明日" : (dueOn ?? "期限");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({ title: trimmed, dueOn, isPurchase });
    setTitle("");
    setDueOn(null);
    setIsPurchase(false);
    setShowDuePanel(false);
  }

  function selectDue(value: string | null) {
    setDueOn(value);
    setShowDuePanel(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white px-4 pt-2 dark:border-zinc-800 dark:bg-black"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-2 pb-2">
        <Chip
          active={!!dueOn || showDuePanel}
          onClick={() => setShowDuePanel((current) => !current)}
        >
          📅 {dueLabel}
        </Chip>
        <Chip
          active={isPurchase}
          onClick={() => setIsPurchase((current) => !current)}
        >
          🛒 買うもの
        </Chip>
      </div>

      {showDuePanel && (
        <div className="mx-auto flex max-w-xl flex-wrap items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => selectDue(today)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700 dark:text-zinc-400"
          >
            今日
          </button>
          <button
            type="button"
            onClick={() => selectDue(tomorrow)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700 dark:text-zinc-400"
          >
            明日
          </button>
          <input
            type="date"
            value={dueOn ?? ""}
            onChange={(event) => setDueOn(event.target.value || null)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {dueOn && (
            <button
              type="button"
              onClick={() => selectDue(null)}
              className="text-xs text-zinc-400 underline"
            >
              期限なしにする
            </button>
          )}
        </div>
      )}

      <div className="mx-auto flex max-w-xl items-center gap-2 pb-2">
        <label htmlFor={inputId} className="sr-only">
          やること・買うものを入力
        </label>
        <input
          id={inputId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="やること・買うものを入力"
          className="min-w-0 flex-1 rounded-full border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="shrink-0 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          追加
        </button>
      </div>
    </form>
  );
}
