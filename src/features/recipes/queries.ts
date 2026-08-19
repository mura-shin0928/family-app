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

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id, title, source_url, source_text, note, created_at")
    .eq("family_id", familyId)
    .eq("id", recipeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to load recipe: ${error.message}`);
  }
  if (!recipe) return null;

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("id, name, quantity, sort_order, task_id")
    .eq("recipe_id", recipeId)
    .eq("family_id", familyId)
    .order("sort_order", { ascending: true });

  if (ingredientsError) {
    throw new Error(
      `failed to load recipe ingredients: ${ingredientsError.message}`,
    );
  }

  const linkedTaskIds = [
    ...new Set(
      (ingredients ?? [])
        .map((row) => row.task_id)
        .filter((id): id is string => !!id),
    ),
  ];

  let livePurchaseTaskIds = new Set<string>();
  if (linkedTaskIds.length > 0) {
    const { data: liveTasks, error: liveTasksError } = await supabase
      .from("tasks")
      .select("id")
      .eq("family_id", familyId)
      .in("id", linkedTaskIds)
      .is("deleted_at", null)
      .eq("status", "open");

    if (liveTasksError) {
      throw new Error(
        `failed to load linked purchase tasks: ${liveTasksError.message}`,
      );
    }

    livePurchaseTaskIds = new Set((liveTasks ?? []).map((row) => row.id));
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
      isInPurchases: row.task_id ? livePurchaseTaskIds.has(row.task_id) : false,
    })),
  };
}
