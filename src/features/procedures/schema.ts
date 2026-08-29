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

// category はリストの項目から起動されるとき常に渡される（「この項目の情報」を
// 探しているという文脈がURLより先に決まっているため）。
export const ingestProcedureSchema = z.object({
  url: httpsUrlSchema,
  areaCode: areaCodeSchema,
  category: z.enum(categoryValues),
});

export const verifyProcedureSchema = z.object({
  procedureId: z.string().uuid(),
});
