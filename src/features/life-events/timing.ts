import type { DateString } from "@/lib/date";

/** 'YYYY-MM-DD' を「2026/3/5」に整形する。 */
export function formatSlashDate(dateString: DateString): string {
  const [year, month, day] = dateString.split("-");
  return `${year}/${Number(month)}/${Number(day)}`;
}
