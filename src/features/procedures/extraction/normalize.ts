import type { BenefitItem, ProcedureDraft } from "./types";

function toNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

function toAnchorEvent(value: string): ProcedureDraft["anchorEvent"] {
  return value === "birth" || value === "expected_birth" ? value : "";
}

function toOffsetCounting(value: string): ProcedureDraft["offsetCounting"] {
  return value === "inclusive" || value === "exclusive" || value === "unknown"
    ? value
    : "";
}

// Gemini構造化出力（すべて文字列フィールド）→ ProcedureDraft の共通正規化。
// 数値・enum系はここで一度だけパースし、不正な値は「未入力」（""/null）に倒す。
export function normalizeDraft(raw: {
  title: string;
  summary: string;
  obligation: ProcedureDraft["obligation"];
  obligation_quote: string;
  deadline_kind: ProcedureDraft["deadlineKind"];
  deadline_on: string;
  anchor_event: string;
  offset_count: string;
  offset_counting: string;
  window_from_days: string;
  window_to_days: string;
  deadline_quote: string;
  deadline_note: string;
  eligibility: string;
  benefits: BenefitItem[];
  where_to_apply: string;
  documents: string;
}): ProcedureDraft {
  return {
    title: raw.title.trim(),
    summary: raw.summary.trim(),
    obligation: raw.obligation,
    obligationQuote: raw.obligation_quote.trim(),
    deadlineKind: raw.deadline_kind,
    deadlineOn: raw.deadline_on.trim(),
    anchorEvent: toAnchorEvent(raw.anchor_event),
    offsetCount: toNullableInt(raw.offset_count),
    offsetCounting: toOffsetCounting(raw.offset_counting),
    windowFromDays: toNullableInt(raw.window_from_days),
    windowToDays: toNullableInt(raw.window_to_days),
    deadlineQuote: raw.deadline_quote.trim(),
    deadlineNote: raw.deadline_note.trim(),
    eligibility: raw.eligibility.trim(),
    benefits: raw.benefits
      .map((benefit) => ({
        label: benefit.label.trim(),
        quote: benefit.quote.trim(),
      }))
      .filter((benefit) => benefit.label !== ""),
    whereToApply: raw.where_to_apply.trim(),
    documents: raw.documents.trim(),
  };
}
