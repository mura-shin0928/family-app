import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
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
});
