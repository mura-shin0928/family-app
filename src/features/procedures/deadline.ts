import { addDaysToDateString, type DateString } from "@/lib/date";
import type {
  AnchorEvent,
  DeadlineKind,
  OffsetCounting,
} from "./extraction/types";
import type { ProcedureCategory, TemplateAnchorEvent } from "./types";

export type ChildAnchorDates = {
  birthDate: DateString | null;
  expectedBirthDate: DateString | null;
};

/**
 * テンプレート項目の目安期限。procedures の取り込みが1件も無くても、子どもの
 * 起点日 + offsetDays から計算できる（根拠quote不要、あくまで目安）。
 * 起点日が未入力なら日付を作らない（procedures側の期限解決と同じ設計原則）。
 */
export function resolveTemplateDeadline(
  item: { anchorEvent: TemplateAnchorEvent | null; offsetDays: number | null },
  child: ChildAnchorDates,
): DateString | null {
  if (item.anchorEvent === null || item.offsetDays === null) return null;
  const anchorDate =
    item.anchorEvent === "birth" ? child.birthDate : child.expectedBirthDate;
  if (anchorDate === null) return null;
  return addDaysToDateString(anchorDate, item.offsetDays);
}

export type ProcedureDeadlineInfo = {
  deadlineKind: DeadlineKind;
  deadlineOn: DateString | null;
  anchorEvent: AnchorEvent | null;
  offsetCount: number | null;
  offsetCounting: OffsetCounting | null;
  windowFromDays: number | null;
  windowToDays: number | null;
};

export type ResolvedProcedureDeadline = {
  on: DateString | null;
  windowFrom: DateString | null;
  windowTo: DateString | null;
};

const NO_DEADLINE: ResolvedProcedureDeadline = {
  on: null,
  windowFrom: null,
  windowTo: null,
};

/**
 * procedures側の正確な期限（引用付き）を日付へ解決する。offset_countingが
 * 'unknown'の場合は早い方(inclusive)に倒す（1日早い表示は無害、1日遅い表示は
 * 期限超過を招くため）— 実データで見つかったoff-by-oneの教訓と同じ規約。
 */
export function resolveProcedureDeadline(
  procedure: ProcedureDeadlineInfo,
  child: ChildAnchorDates,
): ResolvedProcedureDeadline {
  if (procedure.deadlineKind === "fixed") {
    return procedure.deadlineOn === null
      ? NO_DEADLINE
      : { ...NO_DEADLINE, on: procedure.deadlineOn };
  }

  const anchorDate =
    procedure.anchorEvent === "birth"
      ? child.birthDate
      : procedure.anchorEvent === "expected_birth"
        ? child.expectedBirthDate
        : null;
  if (anchorDate === null) return NO_DEADLINE;

  if (procedure.deadlineKind === "relative" && procedure.offsetCount !== null) {
    const days =
      procedure.offsetCounting === "exclusive"
        ? procedure.offsetCount
        : procedure.offsetCount - 1;
    return { ...NO_DEADLINE, on: addDaysToDateString(anchorDate, days) };
  }

  if (
    procedure.deadlineKind === "recommended" &&
    procedure.windowFromDays !== null &&
    procedure.windowToDays !== null
  ) {
    return {
      on: null,
      windowFrom: addDaysToDateString(anchorDate, procedure.windowFromDays),
      windowTo: addDaysToDateString(anchorDate, procedure.windowToDays),
    };
  }

  return NO_DEADLINE;
}

export type MatchableProcedure = {
  category: ProcedureCategory | null;
  areaCode: string | null;
  status: "draft" | "published" | "archived";
};

/**
 * テンプレート項目のcategoryに一致し、家族の市区町村コードに前方一致する
 * area_code を持つ published な procedures だけを返す（純関数）。
 * 市区町村→都道府県→国の順（area_codeが長い順）でソートする。
 */
export function matchProceduresForItem<T extends MatchableProcedure>(
  category: ProcedureCategory | null,
  procedures: readonly T[],
  municipalityCode: string | null,
): T[] {
  if (category === null) return [];
  return procedures
    .filter((p) => p.status === "published" && p.category === category)
    .filter(
      (p) => p.areaCode === null || municipalityCode?.startsWith(p.areaCode),
    )
    .sort((a, b) => (b.areaCode?.length ?? 0) - (a.areaCode?.length ?? 0));
}
