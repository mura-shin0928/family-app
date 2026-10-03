import type { RecipeDetailDTO } from "./types";

/** レシピ編集フォームの入力値。未設定 = 空文字。 */
export type RecipeFormValues = {
  title: string;
  sourceUrl: string;
  sourceText: string;
  note: string;
  ingredients: { name: string; quantity: string }[];
};

export function formValuesFromRecipe(
  recipe?: RecipeDetailDTO,
): RecipeFormValues {
  return {
    title: recipe?.title ?? "",
    sourceUrl: recipe?.sourceUrl ?? "",
    sourceText: recipe?.sourceText ?? "",
    note: recipe?.note ?? "",
    ingredients: (recipe?.ingredients ?? []).map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity ?? "",
    })),
  };
}

/** 保存したときに残る形（前後の空白なし・空の材料行なし）に揃えて比べる。 */
function normalize(values: RecipeFormValues) {
  return {
    title: values.title.trim(),
    sourceUrl: values.sourceUrl.trim(),
    sourceText: values.sourceText.trim(),
    note: values.note.trim(),
    ingredients: values.ingredients
      .map((row) => ({ name: row.name.trim(), quantity: row.quantity.trim() }))
      .filter((row) => row.name !== "" || row.quantity !== ""),
  };
}

export function isRecipeFormDirty(
  original: RecipeFormValues,
  current: RecipeFormValues,
): boolean {
  return (
    JSON.stringify(normalize(original)) !== JSON.stringify(normalize(current))
  );
}
