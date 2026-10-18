"use client";

import { useEffect } from "react";
import { captureClientException } from "@/lib/analytics/client";

// ルートの layout ごと置き換わるため、テーマやフォントは効かない。素の HTML で出す
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    captureClientException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>問題が起きました</h1>
        <p style={{ margin: 0 }}>時間をおいて、もう一度お試しください。</p>
        <button type="button" onClick={() => retry()}>
          再読み込み
        </button>
      </body>
    </html>
  );
}
