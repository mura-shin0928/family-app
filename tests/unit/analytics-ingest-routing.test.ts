import {
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { config } from "../../src/proxy";

describe("/ingest の中継", () => {
  it("proxy（認証チェック）は /ingest を通らない", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig,
        url: "/ingest/e/",
      }),
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig,
        url: "/ingest/static/array.js",
      }),
    ).toBe(false);
  });

  it("ほかのページは今までどおり proxy を通る", () => {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig, url: "/tasks" }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig, url: "/ingestion" }),
    ).toBe(true);
  });

  it("/ingest は PostHog EU に書き換わる", async () => {
    const events = await unstable_getResponseFromNextConfig({
      url: "https://family.example.test/ingest/e/",
      nextConfig,
    });
    expect(getRewrittenUrl(events)).toBe("https://eu.i.posthog.com/e");

    const assets = await unstable_getResponseFromNextConfig({
      url: "https://family.example.test/ingest/static/array.js",
      nextConfig,
    });
    expect(getRewrittenUrl(assets)).toBe(
      "https://eu-assets.i.posthog.com/static/array.js",
    );
  });
});
