import "server-only";

import { after } from "next/server";
import {
  captureServerException,
  toServerExceptionInput,
} from "@/lib/analytics/exception";

/**
 * Server Action が汎用メッセージを返す失敗をサーバーログに残し、エラー監視にも送る。
 * details / hint は入力値を含みうるので出さない。
 */
export function logActionError(
  action: string,
  error: { code?: string; message: string },
): void {
  console.error(`[action] ${action} failed`, {
    code: error.code,
    message: error.message,
  });
  const input = toServerExceptionInput({ action, error });
  try {
    after(() => captureServerException(input));
  } catch {
    // リクエストの外（スクリプトなど）では after が使えない。ログだけ残す
  }
}
