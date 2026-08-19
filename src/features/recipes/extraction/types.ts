export type RecipeDraft = {
  title: string;
  ingredients: { name: string; quantity: string }[];
};

export type ExtractionFailureReason =
  | "no-key"
  | "timeout"
  | "api-error"
  | "invalid-response";

export type ExtractionResult =
  | { kind: "draft"; draft: RecipeDraft }
  | { kind: "failed"; reason: ExtractionFailureReason };
