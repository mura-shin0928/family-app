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
  /**
   * 連結先のタスクが「生きている買うもの」として存在するか（未完了・未削除）。
   * 完了/削除されていれば false に倒れ、次回また既定ONで追加できる。
   */
  isInPurchases: boolean;
};

export type RecipeDetailDTO = RecipeDTO & {
  sourceText: string | null;
  ingredients: RecipeIngredientDTO[];
};
