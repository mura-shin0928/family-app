import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthog }));

const identity = { memberId: "m1", familyId: "f1" };

async function importSanitize() {
  return (await import("@/lib/analytics/sanitize")).stripPageContext;
}

describe("analytics client", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const fn of Object.values(posthog)) fn.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("キーがなければ init を呼ばず、送信もしない", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const client = await import("@/lib/analytics/client");

    expect(client.initAnalytics(identity)).toBe(false);
    client.captureAppOpened();
    client.captureClientException(new Error("x"));

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.captureException).not.toHaveBeenCalled();
  });

  it("init は自動収集・ページビュー・ページ離脱・録画を切り、例外の自動送信だけ入れる", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("@/lib/analytics/client");
    const stripPageContext = await importSanitize();

    expect(initAnalytics(identity)).toBe(true);

    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
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
      }),
    );
  });

  it("初期化の前に起きたエラーは、初期化したときに送る", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics, captureClientException } = await import(
      "@/lib/analytics/client"
    );
    const error = new Error("cold start");

    captureClientException(error);
    expect(posthog.captureException).not.toHaveBeenCalled();

    initAnalytics(identity);
    expect(posthog.captureException).toHaveBeenCalledWith(error);
  });

  it("identify は memberId だけ、register は family_id だけを渡す", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("@/lib/analytics/client");

    initAnalytics(identity);

    expect(posthog.identify).toHaveBeenCalledWith("m1");
    expect(posthog.register).toHaveBeenCalledWith({ family_id: "f1" });
  });

  it("初期化した後は app_opened をプロパティなしで送る", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics, captureAppOpened } = await import(
      "@/lib/analytics/client"
    );

    initAnalytics(identity);
    captureAppOpened();

    expect(posthog.capture).toHaveBeenCalledWith("app_opened");
  });
});
