"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import {
  createRecipeSchema,
  recipeIdSchema,
  updateRecipeSchema,
} from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

type IngredientInput = {
  id?: string;
  name: string;
  quantity: string;
};

export async function createRecipe(input: {
  id: string;
  title: string;
  sourceUrl: string;
  note: string;
  ingredients: IngredientInput[];
}): Promise<ActionResult> {
  const parsed = createRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase.from("recipes").insert({
    id: parsed.data.id,
    family_id: member.familyId,
    title: parsed.data.title,
    source_url: parsed.data.sourceUrl === "" ? null : parsed.data.sourceUrl,
    note: parsed.data.note === "" ? null : parsed.data.note,
    created_by: member.id,
  });

  if (error) {
    return { ok: false, error: "登録に失敗しました" };
  }

  if (parsed.data.ingredients.length > 0) {
    const { error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .insert(
        parsed.data.ingredients.map((ingredient, index) => ({
          recipe_id: parsed.data.id,
          family_id: member.familyId,
          name: ingredient.name,
          quantity: ingredient.quantity === "" ? null : ingredient.quantity,
          sort_order: index,
        })),
      );

    if (ingredientsError) {
      return { ok: false, error: "材料の登録に失敗しました" };
    }
  }

  return { ok: true };
}

export async function updateRecipe(input: {
  recipeId: string;
  title: string;
  sourceUrl: string;
  note: string;
  ingredients: IngredientInput[];
}): Promise<ActionResult> {
  const parsed = updateRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error: recipeError } = await supabase
    .from("recipes")
    .update({
      title: parsed.data.title,
      source_url: parsed.data.sourceUrl === "" ? null : parsed.data.sourceUrl,
      note: parsed.data.note === "" ? null : parsed.data.note,
    })
    .eq("id", parsed.data.recipeId)
    .eq("family_id", member.familyId);

  if (recipeError) {
    return { ok: false, error: "更新に失敗しました" };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("recipe_ingredients")
    .select("id")
    .eq("recipe_id", parsed.data.recipeId)
    .eq("family_id", member.familyId);

  if (existingError) {
    return { ok: false, error: "材料の更新に失敗しました" };
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.id));
  const submittedIds = new Set(
    parsed.data.ingredients
      .map((ingredient) => ingredient.id)
      .filter((id): id is string => !!id),
  );
  const idsToDelete = [...existingIds].filter((id) => !submittedIds.has(id));

  if (idsToDelete.length > 0) {
    const { error } = await supabase
      .from("recipe_ingredients")
      .delete()
      .in("id", idsToDelete)
      .eq("family_id", member.familyId);

    if (error) {
      return { ok: false, error: "材料の削除に失敗しました" };
    }
  }

  for (const [index, ingredient] of parsed.data.ingredients.entries()) {
    const quantity = ingredient.quantity === "" ? null : ingredient.quantity;

    if (ingredient.id && existingIds.has(ingredient.id)) {
      const { error } = await supabase
        .from("recipe_ingredients")
        .update({ name: ingredient.name, quantity, sort_order: index })
        .eq("id", ingredient.id)
        .eq("family_id", member.familyId);

      if (error) {
        return { ok: false, error: "材料の更新に失敗しました" };
      }
    } else {
      const { error } = await supabase.from("recipe_ingredients").insert({
        recipe_id: parsed.data.recipeId,
        family_id: member.familyId,
        name: ingredient.name,
        quantity,
        sort_order: index,
      });

      if (error) {
        return { ok: false, error: "材料の追加に失敗しました" };
      }
    }
  }

  return { ok: true };
}

export async function deleteRecipe(input: {
  recipeId: string;
}): Promise<ActionResult> {
  const parsed = recipeIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.recipeId)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "削除に失敗しました" };
  }

  return { ok: true };
}
