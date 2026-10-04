import { z } from "zod";
import { httpUrlSchema } from "@/lib/url";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません");

// recipes/schema.ts の sourceUrlSchema / noteSchema と同じ規約
// （空文字列 = 未入力の union、文字数上限はDBのCHECK制約と揃える）。
const urlSchema = z.union([httpUrlSchema, z.literal("")]);

const noteSchema = z.union([
  z.string().trim().max(2000, "メモは2000文字以内で入力してください"),
  z.literal(""),
]);

// 空文字列 = 未設定（tasks.dueOn と同じ規約）。所有チェックは Server Action 側で行う。
const purchaseLocationIdSchema = z.union([z.string().uuid(), z.literal("")]);

// 空文字列 = 記録しない。子が自家族のものかは Server Action 側で確かめる。
const recordChildIdSchema = z.union([z.string().uuid(), z.literal("")]);

export const createTaskSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  // 空文字列 = 期限なし（updateTaskSchema と同じ規約）。
  dueOn: z.union([dateStringSchema, z.literal("")]),
  isPurchase: z.boolean(),
  purchaseLocationId: purchaseLocationIdSchema,
  recordChildId: recordChildIdSchema,
});

export const taskIdSchema = z.object({
  taskId: z.string().uuid(),
});

export const toggleDoneSchema = z.object({
  taskId: z.string().uuid(),
  done: z.boolean(),
});

// 編集シートの保存。含まれる項目だけを更新する（空文字列 = 未設定）。
export const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください")
    .optional(),
  dueOn: z.union([dateStringSchema, z.literal("")]).optional(),
  isPurchase: z.boolean().optional(),
  purchaseLocationId: purchaseLocationIdSchema.optional(),
  url: urlSchema.optional(),
  note: noteSchema.optional(),
});
