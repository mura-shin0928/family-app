"use client";

import posthog from "posthog-js";
import { getPosthogKey } from "./config";
import { stripPageContext } from "./sanitize";

const MAX_PENDING_EXCEPTIONS = 10;

let initialized = false;
// 起動直後は、エラー境界の effect が初期化より先に走ることがある
const pendingExceptions: unknown[] = [];

/**
 * 送るのは識別子とイベント名だけにする。自動収集はボタンの文字を、
 * 自動ページビューは URL（招待トークンなど）を送ってしまうので切り、
 * 自動で付く URL は before_send で消す。
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
      capture_performance: false,
      save_referrer: false,
      advanced_disable_flags: true,
      before_send: stripPageContext,
    });
    initialized = true;
  }
  posthog.identify(identity.memberId);
  posthog.register({ family_id: identity.familyId });
  for (const error of pendingExceptions.splice(0)) {
    posthog.captureException(error);
  }
  return true;
}

export function captureAppOpened(): void {
  if (!initialized) return;
  posthog.capture("app_opened");
}

export function captureClientException(error: unknown): void {
  if (!initialized) {
    if (pendingExceptions.length < MAX_PENDING_EXCEPTIONS) {
      pendingExceptions.push(error);
    }
    return;
  }
  posthog.captureException(error);
}
