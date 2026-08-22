import { extractMainHtml } from "./extraction/extract-main";
import { stripTagsToText } from "./extraction/html-text";

// 索引/制度の機械判定（§6.4）。実測8件で全件正解した閾値。
const INDEX_TEXT_THRESHOLD = 300;
const INDEX_DENSITY_THRESHOLD = 25;

export type CandidateKind = "index" | "procedure";

/**
 * main本文が短い、またはリンク密度が高いページは「索引」と判定する
 * （実測: 東京都「子供家庭」4176字・218リンクのような制度っぽい索引を、
 * 文字数だけでは誤判定するためリンク密度もあわせて見る）。
 */
export function classifyCandidate(main: {
  text: string;
  linkCount: number;
}): CandidateKind {
  const density =
    main.linkCount > 0
      ? main.text.length / main.linkCount
      : Number.POSITIVE_INFINITY;
  const isIndex =
    main.text.length < INDEX_TEXT_THRESHOLD ||
    density < INDEX_DENSITY_THRESHOLD;
  return isIndex ? "index" : "procedure";
}

const INCLUDE_KEYWORDS = [
  "届",
  "手当",
  "助成",
  "補助",
  "給付",
  "健診",
  "検査",
  "医療費",
  "申請",
];
const EXCLUDE_KEYWORDS = [
  "審議会",
  "検討会",
  "計画",
  "調査報告",
  "発掘",
  "報道発表",
];

/**
 * タイトルの機械フィルタで「対象外?」の印を付ける（§6.4）。
 * 制度らしいキーワードが1つでもあれば、除外キーワードが含まれていても対象外にしない。
 */
export function isLikelyExcluded(title: string): boolean {
  if (INCLUDE_KEYWORDS.some((keyword) => title.includes(keyword))) {
    return false;
  }
  return EXCLUDE_KEYWORDS.some((keyword) => title.includes(keyword));
}

// 自治体マスタテーブルは作らない（§2.4）。MVPの対象地域（小金井市+東京都+国）
// のぶんだけホスト名から機械的に決め、それ以外は呼び出し側が指定した値へ倒す。
const KNOWN_MUNICIPALITY_CODES: Record<string, string> = {
  koganei: "13210",
};

/**
 * ページのホスト名から area_code を機械的に決める（§6.4、AIに判断させない）。
 * 小金井市の索引から東京都のページへリンクが出ることがあるため、起点の値を
 * 一律に使うのではなく、リンク先ごとに毎回この関数で決め直す。
 */
export function inferAreaCode(
  hostname: string,
  fallback: string | null,
): string | null {
  const lower = hostname.toLowerCase();

  if (lower.endsWith(".go.jp")) return null; // 国

  const cityMatch = lower.match(/(?:^|\.)city\.([a-z0-9-]+)\.lg\.jp$/);
  const cityCode = cityMatch?.[1]
    ? KNOWN_MUNICIPALITY_CODES[cityMatch[1]]
    : undefined;
  if (cityCode) return cityCode;

  if (lower.endsWith(".metro.tokyo.lg.jp")) return "13";
  const prefMatch = lower.match(/(?:^|\.)pref\.([a-z0-9-]+)\.lg\.jp$/);
  if (prefMatch?.[1] === "tokyo") return "13";

  return fallback;
}

export type LinkCandidate = { url: string; text: string };

const HREF_PATTERN =
  /<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
const IGNORED_SCHEME_PATTERN = /^(javascript|mailto|tel):/i;

/**
 * 索引ページのmain内から同一ホストのリンクだけを列挙する（§6.4）。
 * main限定にする理由はextractMainTextと同じ — グローバルナビが混ざると
 * discoverの候補一覧がノイズだらけになる（実測: 東京都サイトでmainの外は95%以上ナビ）。
 */
export function extractLinks(html: string, baseUrl: string): LinkCandidate[] {
  const base = new URL(baseUrl);
  const mainHtml = extractMainHtml(html);
  const seen = new Set<string>();
  const links: LinkCandidate[] = [];

  for (const match of mainHtml.matchAll(HREF_PATTERN)) {
    const rawHref = match[1]?.trim();
    if (
      !rawHref ||
      rawHref.startsWith("#") ||
      IGNORED_SCHEME_PATTERN.test(rawHref)
    ) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(rawHref, base);
    } catch {
      continue;
    }
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:")
      continue;
    if (resolved.hostname !== base.hostname) continue;

    resolved.hash = "";
    const normalizedUrl = resolved.toString();
    if (normalizedUrl === base.toString()) continue;
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);

    links.push({ url: normalizedUrl, text: stripTagsToText(match[2] ?? "") });
  }

  return links;
}
