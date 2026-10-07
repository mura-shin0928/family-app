import type { ActionResult } from "./action-result";

/** 操作の結果を知らせるスナックバーの中身。severity で成功・失敗の見た目が決まる。 */
export type ResultToast = { severity: "success" | "error"; message: string };

export function successToast(message: string): ResultToast {
  return { severity: "success", message };
}

export function errorToast(message: string): ResultToast {
  return { severity: "error", message };
}

export function toResultToast(
  result: ActionResult,
  successMessage: string,
): ResultToast {
  return result.ok ? successToast(successMessage) : errorToast(result.error);
}
