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

/** 編集フォームの材料1行。id は保存済みの材料だけが持つ。 */
export type IngredientRow = {
  key: string;
  id?: string;
  name: string;
  quantity: string;
};

export function ingredientRowsFromRecipe(
  recipe?: RecipeDetailDTO,
): IngredientRow[] {
  if (!recipe) return [];
  return recipe.ingredients.map((ingredient) => ({
    key: ingredient.id,
    id: ingredient.id,
    name: ingredient.name,
    quantity: ingredient.quantity ?? "",
  }));
}

/** 保存に送る材料。前後の空白を落とし、材料名が空の行は送らない。 */
export function toSubmittedIngredients(
  rows: IngredientRow[],
): { id?: string; name: string; quantity: string }[] {
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      quantity: row.quantity.trim(),
    }))
    .filter((row) => row.name !== "");
}

/** 読み取った「何人分」をメモの末尾に足す。メモが空ならそれだけを入れる。 */
export function appendServingsToNote(note: string, servings: string): string {
  return note.trim() === "" ? servings : `${note}\n${servings}`;
}
