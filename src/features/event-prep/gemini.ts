import "server-only";
import { EVENT_PREP_ENDPOINT } from "./protocol";

export type CallOutcome =
  | { ok: true; json: unknown }
  | { ok: false; reason: "timeout" | "api-error" };

/** 提案用のキーが設定されているか。未設定の環境では入口を出さない。 */
export function isEventPrepConfigured(): boolean {
  return Boolean(process.env.GEMINI_EVENT_PREP_API_KEY);
}

/** Interactions API を1回呼ぶ。呼ぶのはサーバー側だけ。 */
export async function callEventPrep(
  body: object,
  timeoutMs: number,
): Promise<CallOutcome> {
  const apiKey = process.env.GEMINI_EVENT_PREP_API_KEY;
  if (!apiKey) return { ok: false, reason: "api-error" };

  try {
    const response = await fetch(EVENT_PREP_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`event-prep: HTTP ${response.status}`);
      return { ok: false, reason: "api-error" };
    }
    return { ok: true, json: await response.json() };
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    console.error("event-prep: request failed", name);
    return { ok: false, reason: "api-error" };
  }
}
