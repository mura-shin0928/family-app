import { formatSlashDate } from "./timing";
import type { LifeEventItem } from "./types";

/** 記録（やった日が入った項目）。 */
export type DoneItem = LifeEventItem & { doneOn: string };

/** 記録だけを取り出し、やった日の新しい順（同じ日はタイトル順）に並べる。 */
export function sortDoneItems(items: LifeEventItem[]): DoneItem[] {
  return items
    .filter((item): item is DoneItem => item.doneOn !== null)
    .sort(
      (a, b) =>
        b.doneOn.localeCompare(a.doneOn) ||
        a.title.localeCompare(b.title, "ja"),
    );
}

function monthHeading(doneOn: string): string {
  const [year, month] = doneOn.split("-");
  return `${year}年${Number(month)}月`;
}

/** 並べ替え済みの記録を、月の見出し（「2026年3月」）ごとにまとめる。 */
export function groupDoneItemsByMonth(
  sorted: DoneItem[],
): { heading: string; rows: DoneItem[] }[] {
  const groups: { heading: string; rows: DoneItem[] }[] = [];
  for (const item of sorted) {
    const heading = monthHeading(item.doneOn);
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.rows.push(item);
    else groups.push({ heading, rows: [item] });
  }
  return groups;
}

/** 'YYYY-MM-DD' を、月見出しの下に並べる用の「3/5」にする。 */
export function formatMonthDay(doneOn: string): string {
  return formatSlashDate(doneOn).split("/").slice(1).join("/");
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/;

/** メモを URL とそれ以外に、元の並びのまま分ける。 */
export function splitNoteByUrl(
  note: string,
): { text: string; isUrl: boolean }[] {
  return note
    .split(URL_PATTERN)
    .map((text, index) => ({ text, isUrl: index % 2 === 1 }));
}
