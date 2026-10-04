import { decodeHtmlEntities, metaContent, stripTagsToText } from "./html-text";

const MAX_TEXT_LENGTH = 8000;

function extractTitle(html: string): string | null {
  const ogTitle = metaContent(html, "og:title");
  if (ogTitle) return ogTitle;

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag?.[1]) return decodeHtmlEntities(titleTag[1]).trim();

  return null;
}

/**
 * JSON-LDが取れなかったページ向けのフォールバック抽出。
 * HTML文字列 → { title, text }（Geminiに渡す本文）。純関数（I/Oなし）。
 */
export function extractReadable(html: string): { title: string; text: string } {
  const title = extractTitle(html) ?? "";
  const text = stripTagsToText(html).slice(0, MAX_TEXT_LENGTH);
  return { title, text };
}
