"use client";

import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 10 * 60 * 1000;

async function fetchBuildId(): Promise<string | null> {
  try {
    const res = await fetch("/api/build-info", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId: string };
    return data.buildId;
  } catch {
    return null;
  }
}

/**
 * Service Workerなしでデプロイ検知する軽量ポーリング。初回に記録したbuildIdと
 * 以後のポーリング結果を比較し、変化したら「更新する」で reload させるだけ。
 */
export function AppUpdateNotice() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const initialBuildId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdate() {
      const buildId = await fetchBuildId();
      if (cancelled || buildId === null) return;

      if (initialBuildId.current === null) {
        initialBuildId.current = buildId;
        return;
      }

      if (buildId !== initialBuildId.current) {
        setUpdateAvailable(true);
      }
    }

    checkForUpdate();
    const interval = setInterval(checkForUpdate, POLL_INTERVAL_MS);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") checkForUpdate();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <Snackbar
      open={updateAvailable}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      message="新しいバージョンがあります"
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => window.location.reload()}
        >
          更新する
        </Button>
      }
    />
  );
}
