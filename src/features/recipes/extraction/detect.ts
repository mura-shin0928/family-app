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
