import { createHash } from "node:crypto";
import type { WebSearchResult } from "@/features/web-search/types";
import type { CatalogItem } from "./types";

// item-schema.ts の titleSchema の上限と揃える。
const MAX_TITLE_LENGTH = 100;
const MAX_SUMMARY_LENGTH = 200;

/** Web に投げる検索語。自治体が設定済みなら、その名前を前に足して寄せる。 */
export function buildSearchQuery(
  query: string,
  municipalityName: string | null,
): string {
  const trimmed = query.trim();
  return municipalityName ? `${municipalityName} ${trimmed}` : trimmed;
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

function truncate(text: string, max: number): string {
  return Array.from(text).slice(0, max).join("");
}

/**
 * Web の結果をカタログ項目にする。制度の一覧（registryUrls）にすでにあるページと、
 * 結果の中で重複したページは落とす。並び順は検索結果のまま。
 */
export function webResultsToCatalog(
  results: readonly WebSearchResult[],
  registryUrls: readonly string[],
): CatalogItem[] {
  const seen = new Set(registryUrls.map(pageIdentity));
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
