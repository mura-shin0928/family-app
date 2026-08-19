import "server-only";
import { buildRequestBody, GEMINI_ENDPOINT, parseOutput } from "./protocol";
import type { ExtractionResult } from "./types";

// 実疎通で6〜23秒程度のばらつきを確認した（thinking_levelを使うと
// 思考ステップが挟まりレイテンシが安定しない）。ページ側のmaxDuration(30秒)
// に収まる範囲で余裕を持たせる。
const TIMEOUT_MS = 25_000;

export async function extractRecipeFromText(
  text: string,
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { kind: "failed", reason: "no-key" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestBody(text)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { kind: "failed", reason: "api-error" };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { kind: "failed", reason: "invalid-response" };
    }

    return parseOutput(json);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { kind: "failed", reason: "timeout" };
    }
    return { kind: "failed", reason: "api-error" };
  } finally {
    clearTimeout(timeout);
  }
}
