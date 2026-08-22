import { z } from "zod";
import {
  GEMINI_ENDPOINT,
  GEMINI_FALLBACK_MODELS,
  GEMINI_MODEL,
} from "@/features/recipes/extraction/protocol";
import { normalizeDraft } from "./normalize";
import type { ExtractionResult } from "./types";

// モデル・エンドポイント・429フォールバック連鎖はレシピ機能と共有のGemini疎通設定
// （どのモデルが使えるかはfeature非依存のため、二重管理を避けて再利用する）。
export { GEMINI_ENDPOINT, GEMINI_FALLBACK_MODELS, GEMINI_MODEL };

// 送信するのは呼び出し元が渡した本文のみ。family/children には一切触れない。
const SYSTEM_INSTRUCTION =
  "あなたは日本語の行政手続きページの本文から、必須性・期限・メリット・対象条件を抽出するアシスタントです。" +
  "与えられた本文に書かれていることだけを出力してください。本文に無い期限・金額・対象条件を推測しないでください。" +
  "obligation（必須性）とdeadline（期限）には、本文中の該当箇所をobligation_quote / deadline_quoteとして原文のまま引用してください。" +
  "根拠が本文に見当たらない、または判断できない項目はunknown（該当する場合は空文字）にしてください。" +
  "deadline_kindがfixedの場合はdeadline_onにYYYY-MM-DD形式で入れてください。" +
  "deadline_kindがrelativeまたはrecommendedの場合はanchor_event（birth=出生日 / expected_birth=出産予定日）を指定してください。" +
  "relativeの場合はoffset_count（日数の数字のみ）とoffset_counting" +
  "（inclusive=起算日を1日目として数える / exclusive=起算日の翌日から数える / 本文から判断できなければunknown）を入れてください。" +
  "recommendedの場合はwindow_from_days・window_to_days（基準日からの日数の数字のみ）を入れてください。" +
  "deadline_kindがnoneまたはunknownの場合、上記の期限関連フィールドはすべて空文字にしてください。" +
  "benefitsには本文に書かれているメリット・給付のみを、各labelに短い名称、quoteに本文中の該当箇所を入れて配列にしてください。無ければ空配列にしてください。" +
  "eligibility（対象条件）・where_to_apply（申請先）・documents（必要書類）は本文に記載があれば要約して入れ、無ければ空文字にしてください。";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    obligation: {
      type: "string",
      enum: ["required", "benefit", "conditional", "unknown"],
    },
    obligation_quote: { type: "string" },
    deadline_kind: {
      type: "string",
      enum: ["fixed", "relative", "recommended", "none", "unknown"],
    },
    deadline_on: { type: "string" },
    anchor_event: { type: "string", enum: ["birth", "expected_birth", ""] },
    offset_count: { type: "string" },
    offset_counting: {
      type: "string",
      enum: ["inclusive", "exclusive", "unknown", ""],
    },
    window_from_days: { type: "string" },
    window_to_days: { type: "string" },
    deadline_quote: { type: "string" },
    deadline_note: { type: "string" },
    eligibility: { type: "string" },
    benefits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          quote: { type: "string" },
        },
        required: ["label", "quote"],
      },
    },
    where_to_apply: { type: "string" },
    documents: { type: "string" },
  },
  required: [
    "title",
    "summary",
    "obligation",
    "obligation_quote",
    "deadline_kind",
    "deadline_on",
    "anchor_event",
    "offset_count",
    "offset_counting",
    "window_from_days",
    "window_to_days",
    "deadline_quote",
    "deadline_note",
    "eligibility",
    "benefits",
    "where_to_apply",
    "documents",
  ],
} as const;

export function buildRequestBody(text: string, model: string = GEMINI_MODEL) {
  return {
    model,
    input: text,
    system_instruction: SYSTEM_INSTRUCTION,
    store: false,
    generation_config: {
      temperature: 0,
      thinking_level: "low",
    },
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: RESPONSE_SCHEMA,
    },
  };
}

// output_text は便宜フィールドで、thinking_levelを使うと省略されsteps だけが
// 返ってくることがある（レシピ機能と同じ実疎通での確認済み挙動）。両方に対応する。
const geminiStepSchema = z.object({
  type: z.string(),
  content: z
    .array(z.object({ type: z.string(), text: z.string().optional() }))
    .optional(),
});

const geminiResponseSchema = z.object({
  output_text: z.string().optional(),
  steps: z.array(geminiStepSchema).optional(),
});

function extractOutputText(
  response: z.infer<typeof geminiResponseSchema>,
): string | null {
  if (response.output_text) return response.output_text;

  const text = (response.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text as string)
    .join("");

  return text === "" ? null : text;
}

const benefitSchema = z.object({
  label: z.string(),
  quote: z.string(),
});

const draftSchema = z.object({
  title: z.string(),
  summary: z.string(),
  obligation: z.enum(["required", "benefit", "conditional", "unknown"]),
  obligation_quote: z.string(),
  deadline_kind: z.enum([
    "fixed",
    "relative",
    "recommended",
    "none",
    "unknown",
  ]),
  deadline_on: z.string(),
  anchor_event: z.string(),
  offset_count: z.string(),
  offset_counting: z.string(),
  window_from_days: z.string(),
  window_to_days: z.string(),
  deadline_quote: z.string(),
  deadline_note: z.string(),
  eligibility: z.string(),
  benefits: z.array(benefitSchema),
  where_to_apply: z.string(),
  documents: z.string(),
});

export function parseOutput(rawResponseJson: unknown): ExtractionResult {
  const envelope = geminiResponseSchema.safeParse(rawResponseJson);
  if (!envelope.success) {
    return { kind: "failed", reason: "invalid-response" };
  }

  const outputText = extractOutputText(envelope.data);
  if (outputText === null) {
    return { kind: "failed", reason: "invalid-response" };
  }

  let outputJson: unknown;
  try {
    outputJson = JSON.parse(outputText);
  } catch {
    return { kind: "failed", reason: "invalid-response" };
  }

  const parsedDraft = draftSchema.safeParse(outputJson);
  if (!parsedDraft.success) {
    return { kind: "failed", reason: "invalid-response" };
  }

  return { kind: "draft", draft: normalizeDraft(parsedDraft.data) };
}
