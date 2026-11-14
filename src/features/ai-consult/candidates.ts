import { LIFE_EVENT_CATALOG } from "@/features/life-events/catalog";
import {
  type ChildDates,
  selectCurrentItems,
} from "@/features/life-events/search";
import type { CatalogItem } from "@/features/life-events/types";
import type { DateString } from "@/lib/date";

/** 相談の入口に出す候補。いまの時期のテンプレ項目を先頭から limit 件。 */
export function consultCandidates(
  child: ChildDates,
  today: DateString,
  limit: number,
): CatalogItem[] {
  return selectCurrentItems(LIFE_EVENT_CATALOG, child, today).slice(0, limit);
}
