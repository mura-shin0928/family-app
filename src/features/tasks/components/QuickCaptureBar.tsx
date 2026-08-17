"use client";

import { type FormEvent, type ReactNode, useId, useState } from "react";

type DueChoice = "none" | "today" | "tomorrow";

type Props = {
  onSubmit: (input: {
    title: string;
    due: DueChoice;
    isPurchase: boolean;
  }) => void;
};

/**
 * 常設Quick Captureバー。タイトルだけで登録が完了する。
 * チップは「今日/明日/買うもの」の3つだけ（タグUIは意図的に置かない）。
 */
export function QuickCaptureBar({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<DueChoice>("none");
  const [isPurchase, setIsPurchase] = useState(false);
  const inputId = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({ title: trimmed, due, isPurchase });
    setTitle("");
    setDue("none");
    setIsPurchase(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white px-4 pt-2 dark:border-zinc-800 dark:bg-black"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-2 pb-2">
        <Chip
          active={due === "today"}
          onClick={() =>
            setDue((current) => (current === "today" ? "none" : "today"))
          }
        >
          今日
        </Chip>
        <Chip
          active={due === "tomorrow"}
          onClick={() =>
            setDue((current) => (current === "tomorrow" ? "none" : "tomorrow"))
          }
        >
          明日
        </Chip>
        <Chip
          active={isPurchase}
          onClick={() => setIsPurchase((current) => !current)}
        >
          🛒 買うもの
        </Chip>
      </div>
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs whitespace-nowrap ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
          : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}
