import { decodeHtmlEntities, stripTagsToText } from "./html-text";

const MAX_TEXT_LENGTH = 8000;

function extractOgTitle(html: string): string | null {
  const match = html.match(
    /<meta[^>]+property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  if (match?.[1]) return decodeHtmlEntities(match[1]).trim();

  // property/content の順が逆のパターンにも対応。
  const reversed = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']*)["'][^>]+property\s*=\s*["']og:title["'][^>]*>/i,
  );
  if (reversed?.[1]) return decodeHtmlEntities(reversed[1]).trim();

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag?.[1]) return decodeHtmlEntities(titleTag[1]).trim();

  return null;
}

/**
 * JSON-LDが取れなかったページ向けのフォールバック抽出。
 * HTML文字列 → { title, text }（Geminiに渡す本文）。純関数（I/Oなし）。
 */
export function extractReadable(html: string): { title: string; text: string } {
  const title = extractOgTitle(html) ?? "";
  const text = stripTagsToText(html).slice(0, MAX_TEXT_LENGTH);
  return { title, text };
}
