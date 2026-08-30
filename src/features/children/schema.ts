import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません");

// 空文字列 = 未入力（tasks.dueOnと同じ規約）。
// 妊活は子の登録前＝予定日も出生日も無いことが多いので、どちらも未入力でよい
// （旧DB制約 children_needs_a_date は 20260830140000 で撤廃）。
const optionalDateSchema = z.union([dateStringSchema, z.literal("")]);

export const createChildSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "名前を入力してください")
    .max(50, "名前は50文字以内で入力してください"),
  expectedBirthDate: optionalDateSchema,
  birthDate: optionalDateSchema,
});

export const deleteChildSchema = z.object({
  childId: z.string().uuid(),
});

export const updateChildSchema = z.object({
  childId: z.string().uuid(),
  displayName: z
    .string()
    .trim()
    .min(1, "名前を入力してください")
    .max(50, "名前は50文字以内で入力してください"),
  expectedBirthDate: optionalDateSchema,
  birthDate: optionalDateSchema,
});
