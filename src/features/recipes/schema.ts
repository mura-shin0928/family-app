import { z } from "zod";

// 空文字列 = 未入力。tasks/schema.ts の dueOn と同じ規約（"" | 値 の union）。
const ingredientInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, "材料名を入力してください")
    .max(100, "材料名は100文字以内で入力してください"),
  quantity: z.union([
    z.string().trim().max(50, "分量は50文字以内で入力してください"),
    z.literal(""),
  ]),
});

const titleSchema = z
  .string()
  .trim()
  .min(1, "タイトルを入力してください")
  .max(200, "タイトルは200文字以内で入力してください");

const sourceUrlSchema = z.union([
  z.url("URLの形式が正しくありません").max(2000),
  z.literal(""),
]);

const noteSchema = z.union([
  z.string().trim().max(2000, "メモは2000文字以内で入力してください"),
  z.literal(""),
]);

// recipes.source_text のDB制約（20000字）と揃える。
const sourceTextSchema = z.union([
  z.string().max(20000, "本文は20000文字以内で入力してください"),
  z.literal(""),
]);

export const createRecipeSchema = z.object({
  id: z.string().uuid(),
  title: titleSchema,
  sourceUrl: sourceUrlSchema,
  sourceText: sourceTextSchema,
  note: noteSchema,
  ingredients: z
    .array(ingredientInputSchema)
    .max(50, "材料は50件まで登録できます"),
});

export const updateRecipeSchema = createRecipeSchema.omit({ id: true }).extend({
  recipeId: z.string().uuid(),
});

export const recipeIdSchema = z.object({
  recipeId: z.string().uuid(),
});

export const addIngredientsToPurchasesSchema = z.object({
  recipeId: z.string().uuid(),
  ingredientIds: z
    .array(z.string().uuid())
    .min(1, "材料を選択してください")
    .max(50, "一度に追加できるのは50件までです"),
});

export const undoAddIngredientsToPurchasesSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(50),
});

export const analyzeRecipeSourceSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "URLまたは本文を入力してください")
    .max(20000, "本文は20000文字以内で入力してください"),
});
