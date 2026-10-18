import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/public-paths";

describe("isPublicPath", () => {
  it("ログインせずに見られるページは公開", () => {
    for (const path of [
      "/login",
      "/no-access",
      "/auth/callback",
      "/invite/abc",
      "/release-notes",
      "/terms",
      "/privacy",
    ]) {
      expect(isPublicPath(path), path).toBe(true);
    }
  });

  it("アプリの中のページは公開しない", () => {
    for (const path of ["/", "/tasks", "/family", "/recipes/abc", "/admin"]) {
      expect(isPublicPath(path), path).toBe(false);
    }
  });
});
