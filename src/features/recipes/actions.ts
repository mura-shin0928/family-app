"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { urlOnly } from "./extraction/detect";
import { extractRecipeFromText } from "./extraction/gemini";
import type { RecipeDraft } from "./extraction/types";
import {
  addIngredientsToPurchasesSchema,
  analyzeRecipeTextSchema,
  createRecipeSchema,
  recipeIdSchema,
  undoAddIngredientsToPurchasesSchema,
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
  sourceText: string;
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
    source_text: parsed.data.sourceText === "" ? null : parsed.data.sourceText,
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
  sourceText: string;
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
      source_text:
        parsed.data.sourceText === "" ? null : parsed.data.sourceText,
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

export type AddIngredientsToPurchasesResult =
  | { ok: true; taskIds: string[] }
  | { ok: false; error: string };

export async function addIngredientsToPurchases(input: {
  recipeId: string;
  ingredientIds: string[];
}): Promise<AddIngredientsToPurchasesResult> {
  const parsed = addIngredientsToPurchasesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("id, name, quantity, sort_order, recipe_id, family_id")
    .eq("recipe_id", parsed.data.recipeId)
    .eq("family_id", member.familyId)
    .in("id", parsed.data.ingredientIds)
    .order("sort_order", { ascending: true });

  if (ingredientsError) {
    return { ok: false, error: "買うものへの追加に失敗しました" };
  }
  if ((ingredients ?? []).length !== parsed.data.ingredientIds.length) {
    return { ok: false, error: "不正な操作です" };
  }

  const { data: lastTask } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseSortOrder = lastTask?.sort_order ?? 0;

  const taskIdByIngredientId = new Map(
    ingredients.map((ingredient) => [ingredient.id, crypto.randomUUID()]),
  );

  const { error: tasksError } = await supabase.from("tasks").insert(
    ingredients.map((ingredient, index) => ({
      id: taskIdByIngredientId.get(ingredient.id),
      family_id: member.familyId,
      title: ingredient.name,
      due_on: null,
      is_purchase: true,
      sort_order: baseSortOrder + 1 + index,
      created_by: member.id,
    })),
  );

  if (tasksError) {
    return { ok: false, error: "買うものへの追加に失敗しました" };
  }

  const { error: linkError } = await supabase.from("recipe_ingredients").upsert(
    ingredients.map((ingredient) => ({
      id: ingredient.id,
      recipe_id: ingredient.recipe_id,
      family_id: ingredient.family_id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      sort_order: ingredient.sort_order,
      task_id: taskIdByIngredientId.get(ingredient.id) ?? null,
    })),
  );

  if (linkError) {
    return { ok: false, error: "買うものへの追加に失敗しました" };
  }

  return { ok: true, taskIds: [...taskIdByIngredientId.values()] };
}

export async function undoAddIngredientsToPurchases(input: {
  taskIds: string[];
}): Promise<ActionResult> {
  const parsed = undoAddIngredientsToPurchasesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error: tasksError } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", parsed.data.taskIds)
    .eq("family_id", member.familyId);

  if (tasksError) {
    return { ok: false, error: "取り消しに失敗しました" };
  }

  const { error: unlinkError } = await supabase
    .from("recipe_ingredients")
    .update({ task_id: null })
    .in("task_id", parsed.data.taskIds)
    .eq("family_id", member.familyId);

  if (unlinkError) {
    return { ok: false, error: "取り消しに失敗しました" };
  }

  return { ok: true };
}

export type AnalyzeRecipeTextResult =
  | { ok: true; draft: RecipeDraft }
  | { ok: false; error: string; detectedUrl?: string };

const FAILURE_MESSAGES: Record<string, string> = {
  "no-key": "解析機能は現在利用できません。手入力で保存してください。",
  timeout:
    "解析がタイムアウトしました。時間をおいて試すか、手入力で保存してください。",
  "api-error":
    "解析に失敗しました。時間をおいて試すか、手入力で保存してください。",
  "invalid-response":
    "解析結果を読み取れませんでした。手入力で保存してください。",
};

export async function analyzeRecipeText(input: {
  text: string;
}): Promise<AnalyzeRecipeTextResult> {
  const parsed = analyzeRecipeTextSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();

  const detectedUrl = urlOnly(parsed.data.text);
  if (detectedUrl) {
    return {
      ok: false,
      error:
        "URLだけでは材料を読み取れません。本文をコピーして貼り付けてください。",
      detectedUrl,
    };
  }

  const result = await extractRecipeFromText(parsed.data.text);

  if (result.kind === "failed") {
    return {
      ok: false,
      error:
        FAILURE_MESSAGES[result.reason] ??
        "解析に失敗しました。手入力で保存してください。",
    };
  }

  return { ok: true, draft: result.draft };
}
