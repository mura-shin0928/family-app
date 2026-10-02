import { addDaysToDateString, type DateString } from "@/lib/date";
import { formatSlashDate } from "./timing";
import type { CatalogItem, LifeEventItem } from "./types";

export type ChildDates = {
  birthDate: DateString | null;
  expectedBirthDate: DateString | null;
};

/** 「いまの時期」の窓: 今日の何日前から何日後まで（両端を含む）。 */
const WINDOW_DAYS_BEFORE = 30;
const WINDOW_DAYS_AFTER = 90;

/** 項目の目安日。時期がない、または基準日が未入力なら null。 */
export function resolveTargetDate(
  item: CatalogItem,
  child: ChildDates,
): DateString | null {
  if (item.timing === null) return null;
  const base =
    item.timing.anchor === "birth" ? child.birthDate : child.expectedBirthDate;
  if (base === null) return null;
  return addDaysToDateString(base, item.timing.offsetDays);
}

/** 目安日が窓の中にある項目を、目安日の昇順で返す。 */
export function selectCurrentItems(
  items: readonly CatalogItem[],
  child: ChildDates,
  today: DateString,
): CatalogItem[] {
  const from = addDaysToDateString(today, -WINDOW_DAYS_BEFORE);
  const to = addDaysToDateString(today, WINDOW_DAYS_AFTER);
  return items
    .map((item) => ({ item, date: resolveTargetDate(item, child) }))
    .filter(
      (entry): entry is { item: CatalogItem; date: DateString } =>
        entry.date !== null && entry.date >= from && entry.date <= to,
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((entry) => entry.item);
}

/** NFKC → 小文字 → カタカナをひらがなに。 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** title・aliases・summary のどれかに部分一致するか。空の query は常に true。 */
export function matchesQuery(item: CatalogItem, query: string): boolean {
  const q = normalizeForSearch(query.trim());
  if (q === "") return true;
  return [item.title, ...item.aliases, item.summary].some((text) =>
    normalizeForSearch(text).includes(q),
  );
}

export type ItemState =
  | { status: "in_task" }
  | { status: "done"; doneOn: DateString }
  | { status: "none" };

/** 同じ子・同じカタログ key の記録行から状態を引く。 */
export function itemStateFor(
  catalogKey: string,
  childId: string,
  items: readonly LifeEventItem[],
): ItemState {
  const row = items.find(
    (i) => i.catalogKey === catalogKey && i.childId === childId,
  );
  if (row === undefined) return { status: "none" };
  if (row.status === "done" && row.doneOn !== null) {
    return { status: "done", doneOn: row.doneOn };
  }
  return { status: "in_task" };
}

/** 「2026/9/30までが目安」「2026/10/1ごろが目安」。日付が出せなければ null。 */
export function describeTiming(
  item: CatalogItem,
  child: ChildDates,
): string | null {
  const date = resolveTargetDate(item, child);
  if (date === null || item.timing === null) return null;
  return `${formatSlashDate(date)}${item.timing.kind === "deadline" ? "までが目安" : "ごろが目安"}`;
}
