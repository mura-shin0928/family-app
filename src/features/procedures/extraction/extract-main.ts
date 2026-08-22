import { decodeHtmlEntities, stripTagsToText } from "./html-text";

const MAX_TEXT_LENGTH = 8000;

function extractOgTitle(html: string): string {
  const match = html.match(
    /<meta[^>]+property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i,
  );
  if (match?.[1]) return decodeHtmlEntities(match[1]).trim();

  const reversed = html.match(
    /<meta[^>]+content\s*=\s*["']([^"']*)["'][^>]+property\s*=\s*["']og:title["'][^>]*>/i,
  );
  if (reversed?.[1]) return decodeHtmlEntities(reversed[1]).trim();

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag?.[1]) return decodeHtmlEntities(titleTag[1]).trim();

  return "";
}

// <main> があればその中だけを本文にする（無ければ全体にフォールバック）。実測で、
// 小金井市サイトは全体の6割、東京都サイトは95%以上がグローバルナビだった。
// <main> 限定にすることで、引用照合の母集合がナビを含まず本文に閉じる。
function extractMainHtml(html: string): string {
  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return match?.[1] ?? html;
}

// 「更新日：2026年4月1日」（小金井市、コロンあり）と「更新日 2019年9月10日」
// （東京都、コロンなし）の両方を1つの正規表現で拾う。
const UPDATED_ON_PATTERN =
  /更新日[：:\s]*([0-9]{4})年([0-9]{1,2})月([0-9]{1,2})日/;

function extractUpdatedOn(text: string): string | null {
  const match = text.match(UPDATED_ON_PATTERN);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export type MainTextResult = {
  title: string;
  text: string;
  updatedOn: string | null;
  linkCount: number;
};

/**
 * HTML文字列 → { title, text, updatedOn, linkCount }（Geminiに渡す本文と、discoverの
 * 索引/制度判定に使う付随情報）。純関数（I/Oなし）。
 */
export function extractMainText(html: string): MainTextResult {
  const mainHtml = extractMainHtml(html);
  const linkCount = (mainHtml.match(/<a[\s>]/gi) ?? []).length;
  const text = stripTagsToText(mainHtml).slice(0, MAX_TEXT_LENGTH);

  return {
    title: extractOgTitle(html),
    text,
    updatedOn: extractUpdatedOn(text),
    linkCount,
  };
}
