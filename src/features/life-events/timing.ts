import { addDaysToDateString, type DateString } from "@/lib/date";
import type { LifeEventAnchor, TimingKind } from "./types";

/**
 * 項目の目安時期を引くための基準日。どれが使われるかは項目の anchor_event で決まる:
 * 'birth' / 'expected_birth' は項目が属するライフイベントの子から、'event_start' は
 * そのライフイベントの started_on（妊活など子に紐づかないイベント）から。
 */
export type LifeEventAnchorDates = {
  birthDate: DateString | null;
  expectedBirthDate: DateString | null;
  startedOn: DateString | null;
};

export const EMPTY_ANCHOR_DATES: LifeEventAnchorDates = {
  birthDate: null,
  expectedBirthDate: null,
  startedOn: null,
};

/**
 * 項目の目安時期を1つの日付へ解決する。anchor_event と offset_days、そのイベントの
 * 基準日から計算する。基準日が未入力なら日付を作らない（あくまで目安であって
 * 根拠 quote は持たない）。
 */
export function resolveLifeEventProcedureDate(
  item: { anchorEvent: LifeEventAnchor | null; offsetDays: number | null },
  anchor: LifeEventAnchorDates,
): DateString | null {
  if (item.anchorEvent === null || item.offsetDays === null) return null;
  const base =
    item.anchorEvent === "birth"
      ? anchor.birthDate
      : item.anchorEvent === "expected_birth"
        ? anchor.expectedBirthDate
        : anchor.startedOn;
  if (base === null) return null;
  return addDaysToDateString(base, item.offsetDays);
}

export const TIMING_KIND_OPTIONS: readonly {
  value: TimingKind;
  label: string;
}[] = [
  { value: "deadline", label: "〜まで" },
  { value: "around", label: "〜ごろ" },
];

export const ANCHOR_OPTIONS: readonly {
  value: LifeEventAnchor;
  label: string;
}[] = [
  { value: "expected_birth", label: "出産予定日" },
  { value: "birth", label: "出生日" },
  { value: "event_start", label: "イベント開始日" },
];

/** 'YYYY-MM-DD' を「2026年9月2日」に整形する。 */
export function formatJpDate(dateString: DateString): string {
  const [year, month, day] = dateString.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

/**
 * 行の下に出す時期の一行。項目の目安日（基準日 + オフセット）を timing_kind に
 * 合わせて「〜までが目安」/「〜ごろが目安」にする。基準日が未入力で日付を出せない
 * ときは null。
 */
export function describeProcedureTiming(
  item: {
    timingKind: TimingKind;
    anchorEvent: LifeEventAnchor | null;
    offsetDays: number | null;
  },
  anchor: LifeEventAnchorDates,
): string | null {
  const estimate = resolveLifeEventProcedureDate(item, anchor);
  if (estimate === null) return null;

  return item.timingKind === "deadline"
    ? `${formatJpDate(estimate)}までが目安`
    : `${formatJpDate(estimate)}ごろが目安`;
}
