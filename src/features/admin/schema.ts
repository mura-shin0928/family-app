import { z } from "zod";

export const createFamilySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Family名を入力してください")
    .max(50, "Family名は50文字以内で入力してください"),
});

export const familyIdSchema = z.string().uuid();
