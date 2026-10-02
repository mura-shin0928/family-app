import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません");

const titleSchema = z
  .string()
  .trim()
  .min(1, "項目名を入力してください")
  .max(100, "項目名は100文字以内で入力してください");

const catalogKeySchema = z.string().min(1).max(200);

const childIdSchema = z.string().uuid();

export const addLifeEventItemToTaskSchema = z.object({
  childId: childIdSchema,
  catalogKey: catalogKeySchema,
  title: titleSchema,
  // 空文字列 = 期限なし
  dueOn: z.union([dateStringSchema, z.literal("")]),
  // 制度（program:）の公式ページ。空文字列 = なし
  url: z
    .union([z.url("URLの形式が正しくありません").max(2000), z.literal("")])
    .optional(),
});

export const recordLifeEventItemDoneSchema = z.object({
  childId: childIdSchema,
  catalogKey: catalogKeySchema,
  title: titleSchema,
  doneOn: dateStringSchema,
});

export const updateLifeEventItemDoneOnSchema = z.object({
  id: z.string().uuid(),
  doneOn: dateStringSchema,
});

export const updateLifeEventItemNoteSchema = z.object({
  id: z.string().uuid(),
  note: z.union([
    z.string().trim().max(2000, "メモは2000文字以内で入力してください"),
    z.literal(""),
  ]),
});

export const lifeEventItemIdSchema = z.object({ id: z.string().uuid() });

export const fetchAreaCatalogSchema = z.object({ childId: childIdSchema });
