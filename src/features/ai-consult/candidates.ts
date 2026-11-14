import { LIFE_EVENT_CATALOG } from "@/features/life-events/catalog";
import {
  type ChildDates,
  selectCurrentItems,
} from "@/features/life-events/search";
import type { CatalogItem } from "@/features/life-events/types";
import type { DateString } from "@/lib/date";

/** 相談の入口に出す候補。いまの時期のテンプレ項目から、記録済みを除いて先頭から limit 件。 */
export function consultCandidates(
  child: ChildDates,
  today: DateString,
  limit: number,
  doneKeys: ReadonlySet<string>,
): CatalogItem[] {
  return selectCurrentItems(LIFE_EVENT_CATALOG, child, today)
    .filter((item) => !doneKeys.has(item.key))
    .slice(0, limit);
}
