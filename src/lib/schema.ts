import { z } from "zod";

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません");

// 空文字列 = 未入力。上限はDBのCHECK制約（tasks.note / recipes.note / life_event_items.note）と揃える。
export const noteSchema = z.union([
  z.string().trim().max(2000, "メモは2000文字以内で入力してください"),
  z.literal(""),
]);
