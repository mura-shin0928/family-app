"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * 未保存の変更がある間、ページ内リンク（ヘッダーの戻る・下部タブ）での遷移を
 * 止めて確認を挟み、再読み込み・タブを閉じる操作にはブラウザ標準の確認を出す。
 * ブラウザ／OS の「戻る」は App Router で正式に止められないため対象外。
 */
export function useLeaveConfirm(dirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;

    // next/link の onClick（React は document に委譲）より先に止めるため、window の capture で拾う。
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("click", handleClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  return {
    confirmOpen: pendingHref !== null,
    stay: () => setPendingHref(null),
    leave: () => {
      if (pendingHref) router.push(pendingHref);
      setPendingHref(null);
    },
  };
}
