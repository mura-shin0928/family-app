import type { RecipeDraft } from "./types";

export const MAX_INGREDIENTS = 50;
export const MAX_NAME_LENGTH = 100;
export const MAX_QUANTITY_LENGTH = 50;
export const MAX_SERVINGS_LENGTH = 50;

// Gemini抽出・JSON-LD抽出の両方が通す共通の正規化。
// 上限（件数・文字数）と空name破棄のルールを1か所に揃える。
export function normalizeDraft(raw: {
  title: string;
  servings?: string;
  ingredients: { name: string; quantity: string }[];
}): RecipeDraft {
  const ingredients = raw.ingredients
    .map((ingredient) => ({
      name: ingredient.name.trim().slice(0, MAX_NAME_LENGTH),
      quantity: ingredient.quantity.trim().slice(0, MAX_QUANTITY_LENGTH),
    }))
    .filter((ingredient) => ingredient.name !== "")
    .slice(0, MAX_INGREDIENTS);

  return {
    title: raw.title.trim().slice(0, MAX_NAME_LENGTH),
    servings: (raw.servings ?? "").trim().slice(0, MAX_SERVINGS_LENGTH),
    ingredients,
  };
}
