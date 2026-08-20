import "server-only";
import {
  buildImageRequestBody,
  buildRequestBody,
  GEMINI_ENDPOINT,
  GEMINI_FALLBACK_MODELS,
  GEMINI_MODEL,
  type ImageInput,
  parseOutput,
} from "./protocol";
import type { ExtractionResult } from "./types";

// 実疎通で6〜23秒程度のばらつきを確認した（thinking_levelを使うと
// 思考ステップが挟まりレイテンシが安定しない）。ページ側のmaxDuration(30秒)
// に収まる範囲で余裕を持たせる。
const TIMEOUT_MS = 25_000;

// 画像はテキストより入力トークンが多くレイテンシが伸びる想定。実測（サンプル1枚で
// 8〜10秒）はテキストと大差なかったが、実機の高解像度画像ではさらに伸びる可能性が
// あるため、ページ側maxDuration(60秒)に収まる範囲で余裕を持たせる。
const IMAGE_TIMEOUT_MS = 45_000;

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

// 無料枠クォータ超過（429）のときだけ、別クォータバケットのモデルへ順に
// 切り替えて再試行する。それ以外の失敗（タイムアウト・5xx等）は再試行しても
// 状況が変わらないため、その場で結果を確定する。テキスト・画像の両経路で共用。
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

export async function extractRecipeFromText(
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

export async function extractRecipeFromImage(
  images: ImageInput[],
  options?: { deadlineAt?: number },
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { kind: "failed", reason: "no-key" };
  }

  const deadlineAt = options?.deadlineAt ?? Date.now() + IMAGE_TIMEOUT_MS;

  const result = await runWithModelFallback(
    (model) => buildImageRequestBody(images, model),
    apiKey,
    deadlineAt,
    IMAGE_TIMEOUT_MS,
  );

  return toExtractionResult(result);
}
