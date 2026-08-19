export type RecipeDraft = {
  title: string;
  // 何人分・何人前の情報。読み取れない場合は空文字（quantityと同じ規約）。
  servings: string;
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
