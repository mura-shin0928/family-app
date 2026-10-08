import { z } from "zod";
import { isHttpUrl } from "@/lib/url";
import type { WebSearchResult } from "./types";

// 一次情報を確認済み（2026-10時点）: https://docs.tavily.com/documentation/api-reference/endpoint/search
export const TAVILY_ENDPOINT = "https://api.tavily.com/search";

export const MAX_RESULTS = 10;

// リンクとして保存できる長さ（lib/url の httpUrlSchema と同じ）。
const MAX_URL_LENGTH = 2000;

const responseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      content: z.string().optional(),
    }),
  ),
});

// basic は1回1クレジット。
export function buildRequestBody(query: string) {
  return { query, max_results: MAX_RESULTS, search_depth: "basic" };
}

/** 応答を結果の一覧にする。形が想定と違えば null。 */
export function parseResults(json: unknown): WebSearchResult[] | null {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return null;

  const results: WebSearchResult[] = [];
  for (const raw of parsed.data.results) {
    const title = raw.title.trim();
    if (title === "") continue;
    if (raw.url.length > MAX_URL_LENGTH || !isHttpUrl(raw.url)) continue;
    results.push({ title, url: raw.url, snippet: raw.content ?? "" });
    if (results.length === MAX_RESULTS) break;
  }
  return results;
}
