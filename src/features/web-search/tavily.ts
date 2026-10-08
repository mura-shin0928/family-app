import "server-only";
import { buildRequestBody, parseResults, TAVILY_ENDPOINT } from "./protocol";
import type { WebSearchResult } from "./types";

const TIMEOUT_MS = 10_000;

export type WebSearchOutcome =
  | { ok: true; results: WebSearchResult[] }
  | { ok: false; reason: "not-configured" | "unavailable" };

/** Tavily のキーが設定されているか。未設定の環境では Web 検索の入口を画面に出さない。 */
export function isWebSearchConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

/** Tavily で Web を1回検索する。呼ぶのはサーバー側だけ。 */
export async function searchWeb(query: string): Promise<WebSearchOutcome> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "not-configured" };
  }

  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestBody(query)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`tavily: HTTP ${response.status}`);
      return { ok: false, reason: "unavailable" };
    }
    const results = parseResults(await response.json());
    if (results === null) {
      console.error("tavily: unexpected body");
      return { ok: false, reason: "unavailable" };
    }
    return { ok: true, results };
  } catch (error) {
    // キーはヘッダーにしか無く、fetch の例外には含まれない
    console.error(
      "tavily: request failed",
      error instanceof Error ? error.name : "unknown",
    );
    return { ok: false, reason: "unavailable" };
  }
}
