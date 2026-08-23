import { z } from "zod";
import { PROCEDURE_CATEGORIES } from "./types";

const categoryValues = PROCEDURE_CATEGORIES.map((c) => c.value) as [
  string,
  ...string[],
];

// procedures.area_code のDB制約（null / 2桁 / 5桁）と同じ形。空文字列は「全国」を表す。
const areaCodeSchema = z.union([
  z.literal(""),
  z.string().regex(/^[0-9]{2}$/),
  z.string().regex(/^[0-9]{5}$/),
]);

const httpsUrlSchema = z
  .string()
  .trim()
  .max(2000, "URLが長すぎます")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "httpsから始まるURLを入力してください");

export const discoverProcedureLinksSchema = z.object({
  url: httpsUrlSchema,
  areaCode: areaCodeSchema,
});

// category はテンプレート項目から起動されるとき常に渡される（「この項目の情報」を
// 探しているという文脈がURLより先に決まっているため）。
export const ingestProcedureSchema = z.object({
  url: httpsUrlSchema,
  areaCode: areaCodeSchema,
  category: z.enum(categoryValues),
});

const noteSchema = z.union([
  z.string().trim().max(2000, "メモは2000文字以内で入力してください"),
  z.literal(""),
]);

const offsetDaysSchema = z.union([
  z.number().int().min(-3650).max(3650),
  z.literal(""),
]);

export const templateItemFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  note: noteSchema,
  category: z.union([z.enum(categoryValues), z.literal("")]),
  anchorEvent: z.union([z.enum(["birth", "expected_birth"]), z.literal("")]),
  offsetDays: offsetDaysSchema,
});

export const addTemplateItemSchema = templateItemFieldsSchema.extend({
  templateId: z.string().uuid(),
});

export const updateTemplateItemSchema = templateItemFieldsSchema.extend({
  itemId: z.string().uuid(),
});

export const deleteTemplateItemSchema = z.object({
  itemId: z.string().uuid(),
});

export const updateTemplateTitleSchema = z.object({
  templateId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(50, "タイトルは50文字以内で入力してください"),
});

export const verifyProcedureSchema = z.object({
  procedureId: z.string().uuid(),
});

export const addTemplateItemToTaskSchema = z.object({
  templateItemId: z.string().uuid(),
  childId: z.union([z.string().uuid(), z.literal("")]),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  dueOn: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
    z.literal(""),
  ]),
  url: z.union([httpsUrlSchema, z.literal("")]),
  note: noteSchema,
  procedureId: z.union([z.string().uuid(), z.literal("")]),
});
