import { decodeHtmlEntities } from "./html-text";
import { normalizeDraft } from "./normalize";
import { splitIngredientNameAndQuantity } from "./split-ingredient";
import type { RecipeDraft } from "./types";

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const scriptRegex =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null = scriptRegex.exec(html);
  while (match !== null) {
    const raw = match[1];
    if (raw) {
      try {
        blocks.push(JSON.parse(decodeHtmlEntities(raw)));
      } catch {
        // 壊れたJSON-LDブロックは無視し、他のブロックの解析を続ける。
      }
    }
    match = scriptRegex.exec(html);
  }

  return blocks;
}

function isRecipeType(type: unknown): boolean {
  if (typeof type === "string") return type === "Recipe";
  if (Array.isArray(type)) return type.includes("Recipe");
  return false;
}

// JSON-LDは単体オブジェクト / 配列ルート / @graph のいずれでも来る。
// 再帰で全ノードを平坦化し、@type: Recipe を探す。
function collectRecipeNodes(node: unknown, into: Record<string, unknown>[]) {
  if (Array.isArray(node)) {
    for (const item of node) collectRecipeNodes(item, into);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (isRecipeType(obj["@type"])) into.push(obj);
    if (obj["@graph"]) collectRecipeNodes(obj["@graph"], into);
  }
}

function toIngredientList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

/**
 * HTML文字列からschema.org Recipeの構造化データを取り出す。純関数（I/Oなし）。
 * 見つからない・title/材料が読み取れない場合は null（呼び出し側はGeminiにフォールバックする）。
 */
export function extractRecipeFromJsonLd(html: string): RecipeDraft | null {
  const blocks = extractJsonLdBlocks(html);

  const recipeNodes: Record<string, unknown>[] = [];
  for (const block of blocks) collectRecipeNodes(block, recipeNodes);

  for (const recipe of recipeNodes) {
    const name = recipe.name;
    if (typeof name !== "string" || name.trim() === "") continue;

    const ingredientNames = toIngredientList(recipe.recipeIngredient).map(
      (ingredient) => decodeHtmlEntities(ingredient),
    );
    // recipeIngredientを持たないRecipeノードは、まとめ記事などにSEO目的で
    // 付与された名ばかりのJSON-LDである可能性が高い。材料が読み取れない
    // ノードは採用せず、他の候補 → 最終的にはGeminiフォールバックに委ねる。
    if (ingredientNames.length === 0) continue;

    return normalizeDraft({
      title: decodeHtmlEntities(name),
      // 「薄力粉 50g」のように末尾が分量らしいトークンなら分割する。
      // 自信が持てない場合は元の文字列をそのままnameに入れる（誤った分量を作らない）。
      ingredients: ingredientNames.map((ingredient) =>
        splitIngredientNameAndQuantity(ingredient),
      ),
    });
  }

  return null;
}
