import type { TaskDTO } from "./types";

/**
 * 場所フィルタの選択状態。
 * - "all": 絞り込みなし
 * - "none": 場所未設定（＋ 登録済みの場所に一致しない＝削除済みのid）
 * - それ以外: 場所id
 */
export type PurchaseLocationSelection = "all" | "none" | (string & {});

/**
 * 買うものを場所で絞り込む純関数。登録済みの場所に一致しないid（＝削除済み）は
 * "未設定" 扱いにする — UI 側で「未知のid = 未設定」として描画する方針と揃える。
 */
export function filterByPurchaseLocation(
  tasks: TaskDTO[],
  selection: PurchaseLocationSelection,
  knownLocationIds: ReadonlySet<string>,
): TaskDTO[] {
  if (selection === "all") {
    return tasks;
  }

  if (selection === "none") {
    return tasks.filter(
      (task) =>
        task.purchaseLocationId === null ||
        !knownLocationIds.has(task.purchaseLocationId),
    );
  }

  return tasks.filter((task) => task.purchaseLocationId === selection);
}
