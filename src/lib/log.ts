import "server-only";

/**
 * Server Action が汎用メッセージを返す失敗をサーバーログに残す。
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
}
