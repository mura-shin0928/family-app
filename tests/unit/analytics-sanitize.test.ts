import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { stripPageContext } from "@/lib/analytics/sanitize";

const SHARE_URL =
  "https://family.example.test/tasks/share?title=t&text=%E7%89%9B%E4%B9%B3&url=https%3A%2F%2Fexample.com";

function sampleEvent(): CaptureResult {
  return {
    uuid: "u1",
    event: "app_opened",
    properties: {
      family_id: "f1",
      distinct_id: "m1",
      $os: "iOS",
      $current_url: SHARE_URL,
      $pathname: "/tasks/share",
      $host: "family.example.test",
      $referrer: SHARE_URL,
      $referring_domain: "family.example.test",
      $initial_current_url: SHARE_URL,
      $exception_list: [{ type: "Error", value: "boom" }],
      $set: { $current_url: SHARE_URL, $os: "iOS" },
      $set_once: { $initial_pathname: "/recipes/abc/edit" },
    },
    $set: { $pathname: "/tasks/share", $browser: "Safari" },
    $set_once: {
      $initial_current_url: SHARE_URL,
      $initial_referrer: SHARE_URL,
      $initial_referring_domain: "family.example.test",
      $initial_host: "family.example.test",
    },
  };
}

describe("stripPageContext", () => {
  it("URL・パス・ホスト・参照元を、イベントと人のプロパティの両方から消す", () => {
    const result = stripPageContext(sampleEvent());

    expect(JSON.stringify(result)).not.toContain("family.example.test");
    expect(JSON.stringify(result)).not.toContain("/tasks/share");
    expect(JSON.stringify(result)).not.toContain("/recipes/abc");
  });

  it("family_id・端末の情報・例外の中身は残す", () => {
    const result = stripPageContext(sampleEvent());

    expect(result?.properties).toMatchObject({
      family_id: "f1",
      distinct_id: "m1",
      $os: "iOS",
      $exception_list: [{ type: "Error", value: "boom" }],
      $set: { $os: "iOS" },
    });
    expect(result?.$set).toEqual({ $browser: "Safari" });
    expect(result?.$set_once).toEqual({});
  });
});
