"use client";

import { useEffect, useRef } from "react";

/** 積んだ履歴があるときだけ1回戻る。続けて呼んでもページは離れない。 */
export function closeViaHistory(
  pushed: { current: boolean },
  history: Pick<History, "back">,
) {
  if (!pushed.current) return;
  pushed.current = false;
  history.back();
}

/**
 * 全画面のダイアログを端末の「戻る」で閉じられるよう、開いている間だけ履歴を1つ積む。
 * 返り値は画面の「戻る」ボタンから呼ぶ関数。
 */
export function useCloseOnBack(open: boolean, onClose: () => void) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (!pushed.current) {
      window.history.pushState(null, "");
      pushed.current = true;
    }
    function handlePopState() {
      pushed.current = false;
      onClose();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open, onClose]);

  return () => closeViaHistory(pushed, window.history);
}
