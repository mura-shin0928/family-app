import { afterEach, describe, expect, it, vi } from "vitest";
import {
  forwardToPosthog,
  upstreamHeaders,
  upstreamUrl,
} from "@/lib/analytics/ingest-proxy";

const SHARE_PAGE =
  "https://family.example.test/tasks/share?text=%E7%89%9B%E4%B9%B3";

describe("upstreamUrl", () => {
  it("/ingest/static は assets、それ以外は EU の取り込み先に向ける", () => {
    expect(upstreamUrl("https://family.example.test/ingest/e/?ver=1")).toBe(
      "https://eu.i.posthog.com/e/?ver=1",
    );
    expect(
      upstreamUrl("https://family.example.test/ingest/static/exception.js"),
    ).toBe("https://eu-assets.i.posthog.com/static/exception.js");
  });
});

describe("upstreamHeaders", () => {
  it("Cookie・Referer・転送元 IP・認証ヘッダーは渡さない", () => {
    const headers = upstreamHeaders(
      new Headers({
        cookie: "sb-ref-auth-token=secret",
        referer: SHARE_PAGE,
        "x-forwarded-for": "203.0.113.1",
        authorization: "Bearer secret",
        "content-type": "text/plain",
        "user-agent": "Mozilla/5.0",
      }),
    );

    expect(Object.fromEntries(headers)).toEqual({
      "content-type": "text/plain",
      "user-agent": "Mozilla/5.0",
    });
  });
});

describe("forwardToPosthog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("本文はそのまま渡し、応答の Cookie は返さない", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('{"status":1}', {
          status: 200,
          headers: {
            "content-type": "application/json",
            "set-cookie": "tracker=1",
          },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardToPosthog(
      new Request("https://family.example.test/ingest/e/?ver=1", {
        method: "POST",
        headers: { cookie: "sb-ref-auth-token=secret", referer: SHARE_PAGE },
        body: "payload",
      }),
    );

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://eu.i.posthog.com/e/?ver=1");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).has("cookie")).toBe(false);
    expect(new Headers(init.headers).has("referer")).toBe(false);
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe("payload");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(await response.text()).toBe('{"status":1}');
  });
});
