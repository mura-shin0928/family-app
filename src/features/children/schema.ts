import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません");

// 空文字列 = 未入力（tasks.dueOnと同じ規約）。expected/birthのどちらか片方は必須
// というDB制約(children_needs_a_date)はServer Action側でも確認する。
const optionalDateSchema = z.union([dateStringSchema, z.literal("")]);

export const createChildSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "名前を入力してください")
      .max(50, "名前は50文字以内で入力してください"),
    expectedBirthDate: optionalDateSchema,
    birthDate: optionalDateSchema,
  })
  .refine((value) => value.expectedBirthDate !== "" || value.birthDate !== "", {
    message: "出産予定日か出生日のどちらかを入力してください",
  });

export const deleteChildSchema = z.object({
  childId: z.string().uuid(),
});

export const updateChildSchema = z
  .object({
    childId: z.string().uuid(),
    displayName: z
      .string()
      .trim()
      .min(1, "名前を入力してください")
      .max(50, "名前は50文字以内で入力してください"),
    expectedBirthDate: optionalDateSchema,
    birthDate: optionalDateSchema,
  })
  .refine((value) => value.expectedBirthDate !== "" || value.birthDate !== "", {
    message: "出産予定日か出生日のどちらかを入力してください",
  });
