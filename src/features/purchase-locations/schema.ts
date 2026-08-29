import { z } from "zod";

// 買う場所の名前。DB の CHECK（btrim後1〜30文字）と揃える。
const nameSchema = z
  .string()
  .trim()
  .min(1, "名前を入力してください")
  .max(30, "名前は30文字以内で入力してください");

export const createPurchaseLocationSchema = z.object({
  name: nameSchema,
});

export const updatePurchaseLocationSchema = z.object({
  id: z.string().uuid(),
  name: nameSchema,
});

export const deletePurchaseLocationSchema = z.object({
  id: z.string().uuid(),
});
