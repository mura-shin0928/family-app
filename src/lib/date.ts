import { fromZonedTime } from "date-fns-tz";

/** DBの `due_on` と同じ 'YYYY-MM-DD' 形式。TZを持たないカレンダー日付。 */
export type DateString = string;

export const JST_TIME_ZONE = "Asia/Tokyo";

// en-CAロケールはIntlの短い日付形式がYYYY-MM-DDになる（date-fns-tzのtoZonedTime
// +formatより軽い）。todayInJst/addDaysToDateString/daysUntil/formatRelativeDueは
// クライアントからも呼ばれるため、この経路にdate-fns/date-fns-tzを持ち込まない
// （startOfTodayJstUtcだけがサーバー専用でfromZonedTimeを使う）。
const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: JST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 現在時刻（UTCのDate）から、JSTの「今日」を 'YYYY-MM-DD' で返す。 */
export function todayInJst(now: Date = new Date()): DateString {
  return jstDateFormatter.format(now);
}

/** 現在時刻（UTCのDate）から、JSTの「明日」を 'YYYY-MM-DD' で返す。 */
export function tomorrowInJst(now: Date = new Date()): DateString {
  return addDaysToDateString(todayInJst(now), 1);
}

/**
 * JSTにおける「今日」の 00:00 に対応するUTC瞬間を返す。
 * 「今日完了したタスクだけ表示する」のようなクエリの境界値に使う。
 */
export function startOfTodayJstUtc(now: Date = new Date()): Date {
  const [year, month, day] = todayInJst(now).split("-").map(Number);
  // ローカルDateコンストラクタ + fromZonedTime の組み合わせで、
  // 実行環境のTZに依存せず「この年月日のJST 00:00」のUTC瞬間を得る。
  return fromZonedTime(new Date(year, month - 1, day, 0, 0, 0), JST_TIME_ZONE);
}

/**
 * 'YYYY-MM-DD' に days を加算した日付文字列を返す（月末・年またぎ・うるう年を正しく処理する）。
 * 純粋なカレンダー演算のみで、TZ変換は一切行わない。
 */
export function addDaysToDateString(
  dateString: DateString,
  days: number,
): DateString {
  const [year, month, day] = dateString.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateStringUtc(utcDate);
}

/** dueOn が today から何日後かを返す（負値=期限超過、0=今日）。 */
export function daysUntil(dueOn: DateString, today: DateString): number {
  return toUtcEpochDay(dueOn) - toUtcEpochDay(today);
}

/** 「あと3日」のような相対表示。 */
export function formatRelativeDue(
  dueOn: DateString,
  today: DateString,
): string {
  const diff = daysUntil(dueOn, today);
  if (diff === 0) return "今日";
  if (diff === 1) return "明日";
  if (diff > 1) return `あと${diff}日`;
  if (diff === -1) return "昨日";
  return `${Math.abs(diff)}日超過`;
}

function toUtcEpochDay(dateString: DateString): number {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function formatDateStringUtc(date: Date): DateString {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
