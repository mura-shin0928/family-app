export type ObligationKind = "required" | "benefit" | "conditional" | "unknown";

export type DeadlineKind =
  | "fixed"
  | "relative"
  | "recommended"
  | "none"
  | "unknown";

export type AnchorEvent = "birth" | "expected_birth";

export type OffsetCounting = "inclusive" | "exclusive" | "unknown";

export type BenefitItem = { label: string; quote: string };

// procedures テーブルの draft 相当（id/status/source_url等はServer Action側が付与する）。
// "" は「読み取れなかった / 該当しない」を表す（tasks.dueOn・recipesの各draftと同じ規約）。
export type ProcedureDraft = {
  title: string;
  summary: string;
  obligation: ObligationKind;
  obligationQuote: string;
  deadlineKind: DeadlineKind;
  deadlineOn: string;
  anchorEvent: AnchorEvent | "";
  offsetCount: number | null;
  offsetCounting: OffsetCounting | "";
  windowFromDays: number | null;
  windowToDays: number | null;
  deadlineQuote: string;
  deadlineNote: string;
  eligibility: string;
  benefits: BenefitItem[];
  whereToApply: string;
  documents: string;
};

export type ExtractionFailureReason =
  | "no-key"
  | "timeout"
  | "api-error"
  | "invalid-response";

export type ExtractionResult =
  | { kind: "draft"; draft: ProcedureDraft }
  | { kind: "failed"; reason: ExtractionFailureReason };
