import { z } from "zod";

/** リンクとして開いてよい URL か。javascript: や data: を href に流さないための判定。 */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

// 上限はDBのCHECK制約（tasks.url / recipes.source_url）と揃える。
export const httpUrlSchema = z
  .string()
  .max(2000, "URLは2000文字以内で入力してください")
  .refine(isHttpUrl, "URLの形式が正しくありません");
