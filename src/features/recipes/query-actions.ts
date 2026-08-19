"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { getRecipe, getRecipes } from "./queries";
import type { RecipeDetailDTO, RecipeDTO } from "./types";

/**
 * TanStack QueryのqueryFnから直接呼ぶ読み取り専用アクション。familyIdは
 * クライアントからではなく毎回セッションから解決する（tasksと同じ信頼境界）。
 */
export async function fetchRecipes(): Promise<RecipeDTO[]> {
  const { member } = await requireFamilyMember();
  return getRecipes(member.familyId);
}

export async function fetchRecipe(
  recipeId: string,
): Promise<RecipeDetailDTO | null> {
  const { member } = await requireFamilyMember();
  return getRecipe(member.familyId, recipeId);
}
