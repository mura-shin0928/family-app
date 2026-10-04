import { z } from "zod";

export const createFamilySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Family名を入力してください")
    .max(50, "Family名は50文字以内で入力してください"),
});

export const familyIdSchema = z.string().uuid();

export const MAX_RECIPE_ANALYSIS_DAILY_LIMIT = 1000;

/** null は「既定値に戻す」。 */
export const recipeAnalysisDailyLimitSchema = z.object({
  dailyLimit: z
    .number()
    .int("上限は整数で入力してください")
    .min(0, "上限は0以上で入力してください")
    .max(
      MAX_RECIPE_ANALYSIS_DAILY_LIMIT,
      `上限は${MAX_RECIPE_ANALYSIS_DAILY_LIMIT}以下で入力してください`,
    )
    .nullable(),
});
