export const RECIPES_QUERY_KEY = ["recipes"] as const;
export const recipeDetailQueryKey = (recipeId: string) =>
  ["recipes", recipeId] as const;

export type RecipeDTO = {
  id: string;
  title: string;
  sourceUrl: string | null;
  note: string | null;
  createdAt: string;
};

export type RecipeIngredientDTO = {
  id: string;
  name: string;
  quantity: string | null;
  sortOrder: number;
  taskId: string | null;
};

export type RecipeDetailDTO = RecipeDTO & {
  sourceText: string | null;
  ingredients: RecipeIngredientDTO[];
};
