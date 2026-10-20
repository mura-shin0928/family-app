import { createHash } from "node:crypto";
import type { Program } from "@/features/programs/types";
import type { WebSearchResult } from "@/features/web-search/types";
import { programsToCatalog } from "./program-catalog";
import { matchesQuery } from "./search";
import type { CatalogItem } from "./types";

// item-schema.ts の titleSchema の上限と揃える。
const MAX_TITLE_LENGTH = 100;
const MAX_SUMMARY_LENGTH = 200;

/**
 * Web に投げる検索語。自治体が設定済みなら、その名前を前に足して寄せる
 * （検索語にすでに入っていれば足さない）。
 */
export function buildSearchQuery(
  query: string,
  municipalityName: string | null,
): string {
  const trimmed = query.trim();
  if (!municipalityName || trimmed.includes(municipalityName)) return trimmed;
  return `${municipalityName} ${trimmed}`;
}

/**
 * 同じページかどうかを比べるための形。スキーム・フラグメント・パス末尾の / の違いは
 * 同じページとして扱う。
 */
function pageIdentity(url: string): string {
  try {
    const { host, pathname, search } = new URL(url);
    return `${host}${pathname.replace(/\/$/, "")}${search}`;
  } catch {
    return url;
  }
}

/**
 * Web の結果のカタログ key。catalog_key（200文字まで）に URL をそのまま入れられないので
 * ハッシュにする。同じページは同じ key になり、追加済みの判定と二重追加の防止に効く。
 */
export function webCatalogKey(url: string): string {
  const hash = createHash("sha256").update(pageIdentity(url)).digest("hex");
  return `web:${hash.slice(0, 32)}`;
}

/**
 * 「探す」タブがこの検索語で一覧に出している制度のページ。月齢と名前の一致で絞る。
 * 一覧に出ていない制度のページは Web の結果から除かない（名前が違って手元で引けなかった
 * 制度こそ、Web で見つけたいため）。
 */
export function shownProgramUrls(
  programs: Program[],
  ageMonths: number | null,
  query: string,
): string[] {
  return programsToCatalog(programs, ageMonths)
    .filter((item) => matchesQuery(item, query))
    .flatMap((item) => (item.url ? [item.url] : []));
}

function truncate(text: string, max: number): string {
  return Array.from(text).slice(0, max).join("");
}

/**
 * Web の結果をカタログ項目にする。画面にすでに出ている制度のページ（shownUrls）と、
 * 結果の中で重複したページは落とす。並び順は検索結果のまま。
 */
export function webResultsToCatalog(
  results: readonly WebSearchResult[],
  shownUrls: readonly string[],
): CatalogItem[] {
  const seen = new Set(shownUrls.map(pageIdentity));
  const items: CatalogItem[] = [];
  for (const result of results) {
    const identity = pageIdentity(result.url);
    if (seen.has(identity)) continue;
    seen.add(identity);
    items.push({
      key: webCatalogKey(result.url),
      kind: null,
      title: truncate(result.title, MAX_TITLE_LENGTH),
      summary: truncate(result.snippet, MAX_SUMMARY_LENGTH),
      note: null,
      aliases: [],
      timing: null,
      url: result.url,
    });
  }
  return items;
}
