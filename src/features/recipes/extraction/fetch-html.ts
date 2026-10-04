import "server-only";
import { type GuardedResponse, guardedGet } from "./guarded-request";

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 5_000;
const USER_AGENT =
  "FamilyAppRecipeBot/1.0 (+https://github.com/mura-shin0928/family-app)";

export type FetchHtmlResult = { ok: true; html: string } | { ok: false };

export function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * SSRFガード付きのHTML取得。https限定・内部向けIPへの接続拒否（guardedGet）・
 * 手動リダイレクト（最大3回、各ホップも同じガードを通る）・
 * 5秒タイムアウト・1MB上限・content-type検証。生HTML以外は返さない。
 */
export async function fetchHtml(
  urlString: string,
  options: { deadlineAt: number },
): Promise<FetchHtmlResult> {
  let current = parseHttpsUrl(urlString);
  if (!current) return { ok: false };

  let redirects = 0;

  while (true) {
    const timeoutMs = Math.min(
      FETCH_TIMEOUT_MS,
      options.deadlineAt - Date.now(),
    );
    if (timeoutMs <= 0) return { ok: false };

    let response: GuardedResponse;
    try {
      response = await guardedGet(current, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
    } catch {
      return { ok: false };
    }
    const { status, headers, body } = response;

    if (status >= 300 && status < 400) {
      body.destroy();

      if (redirects >= MAX_REDIRECTS) return { ok: false };
      if (!headers.location) return { ok: false };

      let next: URL;
      try {
        next = new URL(headers.location, current);
      } catch {
        return { ok: false };
      }
      if (next.protocol !== "https:") return { ok: false };

      current = next;
      redirects += 1;
      continue;
    }

    const contentType = headers["content-type"] ?? "";
    if (
      status < 200 ||
      status >= 300 ||
      !contentType.toLowerCase().includes("text/html")
    ) {
      body.destroy();
      return { ok: false };
    }

    const decoder = new TextDecoder();
    let html = "";
    let total = 0;
    try {
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        total += chunk.byteLength;
        if (total > MAX_BYTES) {
          body.destroy();
          return { ok: false };
        }
        html += decoder.decode(chunk, { stream: true });
      }
    } catch {
      return { ok: false };
    }
    html += decoder.decode();

    return { ok: true, html };
  }
}
