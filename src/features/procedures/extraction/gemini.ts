import "server-only";
import {
  buildRequestBody,
  GEMINI_ENDPOINT,
  GEMINI_FALLBACK_MODELS,
  GEMINI_MODEL,
  parseOutput,
} from "./protocol";
import type { ExtractionResult } from "./types";

// 1件ずつ処理する取り込みフロー（§6.1）を前提に、レシピのURL解析と同じ粒度
// （ページ側 maxDuration=30秒）で余裕を持たせる。
const TIMEOUT_MS = 25_000;

type CallResult =
  | { kind: "ok"; json: unknown }
  | { kind: "http-error"; status: number }
  | { kind: "parse-error" }
  | { kind: "aborted" }
  | { kind: "network-error" };

async function callGemini(
  body: unknown,
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
      body: JSON.stringify(body),
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

// 無料枠クォータ超過（429）のときだけ、別クォータバケットのモデルへ順に切り替えて
// 再試行する（レシピ機能と同じ連鎖）。それ以外の失敗は再試行しても状況が変わらないため、
// その場で結果を確定する。
async function runWithModelFallback(
  buildBody: (model: string) => unknown,
  apiKey: string,
  deadlineAt: number,
  timeoutMs: number,
): Promise<CallResult> {
  let result: CallResult = { kind: "aborted" };
  for (const model of [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]) {
    result = await callGemini(
      buildBody(model),
      apiKey,
      Math.min(timeoutMs, deadlineAt - Date.now()),
    );
    if (!(result.kind === "http-error" && result.status === 429)) break;
  }
  return result;
}

function toExtractionResult(result: CallResult): ExtractionResult {
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

export async function extractProcedureFromText(
  text: string,
  options?: { deadlineAt?: number },
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { kind: "failed", reason: "no-key" };
  }

  const deadlineAt = options?.deadlineAt ?? Date.now() + TIMEOUT_MS;

  const result = await runWithModelFallback(
    (model) => buildRequestBody(text, model),
    apiKey,
    deadlineAt,
    TIMEOUT_MS,
  );

  return toExtractionResult(result);
}
