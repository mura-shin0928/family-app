/**
 * 招待フローのログイン後リダイレクト先を運ぶCookie名。
 * emailRedirectTo にクエリ文字列を足すとSupabaseのredirect URL許可リストの
 * 完全一致チェックに落ちる（本番site_urlへフォールバックする）ため、
 * クエリではなくCookie経由で next を渡す。
 */
export const INVITE_REDIRECT_COOKIE = "invite_redirect";
