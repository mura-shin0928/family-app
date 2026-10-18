import { describe, expect, it } from "vitest";
import {
  APP_OPENED_INTERVAL_MS,
  shouldCaptureAppOpened,
} from "@/lib/analytics/app-opened";

describe("shouldCaptureAppOpened", () => {
  it("まだ送っていなければ送る", () => {
    expect(shouldCaptureAppOpened(null, 1_000)).toBe(true);
  });

  it("前回から 30 分未満なら送らない", () => {
    expect(shouldCaptureAppOpened(0, APP_OPENED_INTERVAL_MS - 1)).toBe(false);
  });

  it("前回から 30 分たっていれば送る", () => {
    expect(APP_OPENED_INTERVAL_MS).toBe(30 * 60 * 1000);
    expect(shouldCaptureAppOpened(0, APP_OPENED_INTERVAL_MS)).toBe(true);
  });
});
