import { z } from "zod";
import { dateStringSchema, noteSchema } from "@/lib/schema";
import { httpUrlSchema } from "@/lib/url";
import { SEARCH_QUERY_MAX_LENGTH } from "./search";

const titleSchema = z
  .string()
  .trim()
  .min(1, "項目名を入力してください")
  .max(100, "項目名は100文字以内で入力してください");

const catalogKeySchema = z.string().min(1).max(200);

const childIdSchema = z.string().uuid();

// 制度（program:）の公式ページ。空文字列 = なし
const urlSchema = z.union([httpUrlSchema, z.literal("")]).optional();

export const addLifeEventItemToTaskSchema = z.object({
  childId: childIdSchema,
  catalogKey: catalogKeySchema,
  title: titleSchema,
  // 空文字列 = 期限なし
  dueOn: z.union([dateStringSchema, z.literal("")]),
  url: urlSchema,
});

export const recordLifeEventItemDoneSchema = z.object({
  childId: childIdSchema,
  catalogKey: catalogKeySchema,
  title: titleSchema,
  doneOn: dateStringSchema,
  url: urlSchema,
});

export const updateLifeEventItemDoneOnSchema = z.object({
  id: z.string().uuid(),
  doneOn: dateStringSchema,
});

export const updateLifeEventItemNoteSchema = z.object({
  id: z.string().uuid(),
  note: noteSchema,
});

export const lifeEventItemIdSchema = z.object({ id: z.string().uuid() });

export const fetchAreaCatalogSchema = z.object({ childId: childIdSchema });

export const searchWebCatalogSchema = z.object({
  childId: childIdSchema,
  query: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH),
});
