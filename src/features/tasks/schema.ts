import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません");

// recipes/schema.ts の sourceUrlSchema / noteSchema と同じ規約
// （空文字列 = 未入力の union、文字数上限はDBのCHECK制約と揃える）。
const urlSchema = z.union([
  z.url("URLの形式が正しくありません").max(2000),
  z.literal(""),
]);

const noteSchema = z.union([
  z.string().trim().max(2000, "メモは2000文字以内で入力してください"),
  z.literal(""),
]);

export const createTaskSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  // 空文字列 = 期限なし（updateDueDateSchema と同じ規約）。
  dueOn: z.union([dateStringSchema, z.literal("")]),
  isPurchase: z.boolean(),
});

export const taskIdSchema = z.object({
  taskId: z.string().uuid(),
});

export const toggleDoneSchema = z.object({
  taskId: z.string().uuid(),
  done: z.boolean(),
});

export const togglePurchaseSchema = z.object({
  taskId: z.string().uuid(),
  isPurchase: z.boolean(),
});

export const updateDueDateSchema = z.object({
  taskId: z.string().uuid(),
  dueOn: z.union([dateStringSchema, z.literal("")]),
});

export const updateTitleSchema = z.object({
  taskId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
});

export const updateUrlSchema = z.object({
  taskId: z.string().uuid(),
  url: urlSchema,
});

export const updateNoteSchema = z.object({
  taskId: z.string().uuid(),
  note: noteSchema,
});
