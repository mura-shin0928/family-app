/**
 * ログイン後のリダイレクト先を運ぶCookie名。
 * emailRedirectTo にクエリ文字列を足すとSupabaseのredirect URL許可リストの
 * 完全一致チェックに落ちる（本番site_urlへフォールバックする）ため、
 * クエリではなくCookie経由で next を渡す。
 */
export const LOGIN_REDIRECT_COOKIE = "login_redirect";

export const LOGIN_REDIRECT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60,
} as const;

/**
 * ログイン後のリダイレクト先として許可するパスの形。メールやOAuthの
 * リダイレクトURLに載る値のため、想定外のパスへ飛ばさないよう限定する
 * （ドメインをまたぐ値ではないが、パス側の安全側チェックとして持つ）。
 */
const INVITE_PATH_PATTERN = /^\/invite\/[A-Za-z0-9_-]+$/;
const SHARE_PATH_PATTERN = /^\/tasks\/share\?[^#\s]+$/;

// Cookie 1つの上限（約4KB）に、エンコード後も収まる長さ。
const RETURN_PATH_MAX = 3000;

export function sanitizeNextPath(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return INVITE_PATH_PATTERN.test(value) || SHARE_PATH_PATTERN.test(value)
    ? value
    : null;
}

/** 未ログインで来たリクエストの、ログイン後に戻すパス。戻さないなら null。 */
export function loginReturnPath(
  pathname: string,
  search: string,
): string | null {
  const path = `${pathname}${search}`;
  if (path.length > RETURN_PATH_MAX || !SHARE_PATH_PATTERN.test(path)) {
    return null;
  }
  return path;
}
