"use client";

import posthog from "posthog-js";
import { getPosthogKey } from "./config";

let initialized = false;

/**
 * 送るのは識別子とイベント名だけにする。自動収集はボタンの文字を、
 * 自動ページビューは URL（招待トークンなど）を送ってしまうので切る。
 */
export function initAnalytics(identity: {
  memberId: string;
  familyId: string;
}): boolean {
  const key = getPosthogKey();
  if (!key) return false;
  if (!initialized) {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      rageclick: false,
      disable_session_recording: true,
      disable_surveys: true,
      person_profiles: "identified_only",
      capture_exceptions: true,
    });
    initialized = true;
  }
  posthog.identify(identity.memberId);
  posthog.register({ family_id: identity.familyId });
  return true;
}

export function captureAppOpened(): void {
  if (!initialized) return;
  posthog.capture("app_opened");
}

export function captureClientException(error: unknown): void {
  if (!initialized) return;
  posthog.captureException(error);
}
