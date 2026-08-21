import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RecipeDetailDTO, RecipeDTO } from "./types";

export async function getRecipes(familyId: string): Promise<RecipeDTO[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, source_url, note, created_at")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`failed to load recipes: ${error.message}`);
  }

  return (data ?? []).map(
    (row): RecipeDTO => ({
      id: row.id,
      title: row.title,
      sourceUrl: row.source_url,
      note: row.note,
      createdAt: row.created_at,
    }),
  );
}

export async function getRecipe(
  familyId: string,
  recipeId: string,
): Promise<RecipeDetailDTO | null> {
  const supabase = await createClient();

  // レシピ本体と材料は互いに依存しないクエリなので、往復レイテンシを重ねない
  // よう並行して投げる（材料側はrecipeIdの所有チェックをfamily_idで直接行う）。
  const [
    { data: recipe, error },
    { data: ingredients, error: ingredientsError },
  ] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, source_url, source_text, note, created_at")
      .eq("family_id", familyId)
      .eq("id", recipeId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("recipe_ingredients")
      .select("id, name, quantity, sort_order, task_id")
      .eq("recipe_id", recipeId)
      .eq("family_id", familyId)
      .order("sort_order", { ascending: true }),
  ]);

  if (error) {
    throw new Error(`failed to load recipe: ${error.message}`);
  }
  if (!recipe) return null;

  if (ingredientsError) {
    throw new Error(
      `failed to load recipe ingredients: ${ingredientsError.message}`,
    );
  }

  return {
    id: recipe.id,
    title: recipe.title,
    sourceUrl: recipe.source_url,
    sourceText: recipe.source_text,
    note: recipe.note,
    createdAt: recipe.created_at,
    ingredients: (ingredients ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      sortOrder: row.sort_order,
      taskId: row.task_id,
    })),
  };
}
