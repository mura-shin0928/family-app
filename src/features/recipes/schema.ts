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

// Geminiが画像入力として受け付けるMIMEタイプ（HEIC/HEIFはサーバへそのまま
// 転送してGemini側のデコードに任せる。クライアント側で圧縮に失敗したときの
// フォールバック経路）。クライアント側の圧縮結果は改ざん可能なため、
// サーバ側でも同じ定数を使って再検証する。
export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

// クライアント側圧縮の目標値。実測で調整する前提の暫定値。
export const IMAGE_TARGET_BYTES = 1_200_000;
// サーバ側で拒否するハード上限。Vercel Functionのリクエストボディ上限(4.5MB)
// および next.config.ts の bodySizeLimit(3MB, multipartのオーバーヘッド込み)
// に十分な余裕を持たせる。
export const IMAGE_HARD_LIMIT_BYTES = 2_000_000;
// MVPは1画像のみ（詳細はプラン参照）。将来複数枚に対応する余地として定数化する。
export const MAX_RECIPE_IMAGES = 1;
