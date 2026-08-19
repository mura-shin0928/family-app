import "server-only";
import {
  buildRequestBody,
  GEMINI_ENDPOINT,
  GEMINI_FALLBACK_MODELS,
  GEMINI_MODEL,
  parseOutput,
} from "./protocol";
import type { ExtractionResult } from "./types";

// 実疎通で6〜23秒程度のばらつきを確認した（thinking_levelを使うと
// 思考ステップが挟まりレイテンシが安定しない）。ページ側のmaxDuration(30秒)
// に収まる範囲で余裕を持たせる。
const TIMEOUT_MS = 25_000;

type CallResult =
  | { kind: "ok"; json: unknown }
  | { kind: "http-error"; status: number }
  | { kind: "parse-error" }
  | { kind: "aborted" }
  | { kind: "network-error" };

async function callGemini(
  text: string,
  model: string,
  apiKey: string,
  timeoutMs: number,
): Promise<CallResult> {
  if (timeoutMs <= 0) return { kind: "aborted" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestBody(text, model)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { kind: "http-error", status: response.status };
    }

    try {
      return { kind: "ok", json: await response.json() };
    } catch {
      return { kind: "parse-error" };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { kind: "aborted" };
    }
    return { kind: "network-error" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractRecipeFromText(
  text: string,
  options?: { deadlineAt?: number },
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { kind: "failed", reason: "no-key" };
  }

  const deadlineAt = options?.deadlineAt ?? Date.now() + TIMEOUT_MS;

  // 無料枠クォータ超過（429）のときだけ、別クォータバケットのモデルへ順に
  // 切り替えて再試行する。それ以外の失敗（タイムアウト・5xx等）は再試行しても
  // 状況が変わらないため、その場で結果を確定する。
  let result: CallResult = { kind: "aborted" };
  for (const model of [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]) {
    result = await callGemini(
      text,
      model,
      apiKey,
      Math.min(TIMEOUT_MS, deadlineAt - Date.now()),
    );
    if (!(result.kind === "http-error" && result.status === 429)) break;
  }

  switch (result.kind) {
    case "ok":
      return parseOutput(result.json);
    case "aborted":
      return { kind: "failed", reason: "timeout" };
    case "parse-error":
      return { kind: "failed", reason: "invalid-response" };
    default:
      return { kind: "failed", reason: "api-error" };
  }
}
