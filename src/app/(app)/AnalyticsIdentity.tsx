"use client";

import { useEffect } from "react";
import { shouldCaptureAppOpened } from "@/lib/analytics/app-opened";
import { captureAppOpened, initAnalytics } from "@/lib/analytics/client";

type Props = { memberId: string; familyId: string };

export function AnalyticsIdentity({ memberId, familyId }: Props) {
  useEffect(() => {
    if (!initAnalytics({ memberId, familyId })) return;

    let lastCapturedAt: number | null = null;
    function captureIfDue() {
      const now = Date.now();
      if (!shouldCaptureAppOpened(lastCapturedAt, now)) return;
      lastCapturedAt = now;
      captureAppOpened();
    }

    captureIfDue();
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") captureIfDue();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [memberId, familyId]);

  return null;
}
