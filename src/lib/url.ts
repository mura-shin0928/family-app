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

/** URL のホスト名。URL として読めなければ null。 */
export function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

// 上限はDBのCHECK制約（tasks.url / recipes.source_url）と揃える。
export const httpUrlSchema = z
  .string()
  .max(2000, "URLは2000文字以内で入力してください")
  .refine(isHttpUrl, "URLの形式が正しくありません");
