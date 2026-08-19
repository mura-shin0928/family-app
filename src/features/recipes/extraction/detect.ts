/**
 * 入力の trim 後の文字列全体が単体の http(s) URL であればそれを返す。
 * それ以外（本文が混ざる・URL以外のスキーム・URLでない）は null。
 */
export function urlOnly(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "" || /\s/.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  return trimmed;
}

const PASTE_ONLY_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "instagram.com",
  "www.instagram.com",
]);

/**
 * X / Instagram は本文を取得できる保証がない（IGはアプリトークン必須）ため、
 * fetch を試みず「本文を貼り付けてください」に倒すホスト一覧。
 */
export function isPasteOnlyHost(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return PASTE_ONLY_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
