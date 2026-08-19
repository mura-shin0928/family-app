/**
 * ログイン後のリダイレクト先として許可するパスの形。メールやOAuthの
 * リダイレクトURLに載る値のため、想定外のパスへ飛ばさないよう限定する
 * （ドメインをまたぐ値ではないが、パス側の安全側チェックとして持つ）。
 */
const NEXT_PATH_PATTERN = /^\/invite\/[A-Za-z0-9_-]+$/;

export function sanitizeNextPath(
  value: string | null | undefined,
): string | null {
  return value && NEXT_PATH_PATTERN.test(value) ? value : null;
}
