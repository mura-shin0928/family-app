import { z } from "zod";
import { normalizeDraft } from "./normalize";
import type { ExtractionResult } from "./types";

// 一次情報を確認済み（2026-08時点）: https://ai.google.dev/gemini-api/docs/structured-output
// 学習データの `:generateContent` / `responseSchema` / `gemini-2.5-flash` から変わっている。
export const GEMINI_MODEL = "gemini-3.7-flash";
// 無料枠クォータ(429)を使い切った際のフォールバック連鎖。実測でモデルごとに別
// クォータバケットであることを確認済み（3.7-flashが429でも他の3モデルは
// いずれも200で成功する）。応答形式（steps/model_outputの入れ方）はparseOutputと
// 互換で追加対応は不要だった。品質・レイテンシが近い順（3.7に近いバージョン→
// 軽量モデル）に並べ、429のときだけ次に進む。
// gemini-2.5-flash-liteは実測で404（廃止・3.5-flash-liteへの移行を促すメッセージ）
// だったため候補に含めていない。
export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
];
export const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

// 送信するのは呼び出し元が渡した本文のみ。family / task / メンバー名は一切載せない。
const SYSTEM_INSTRUCTION =
  "あなたは日本語のレシピ本文から料理名と材料を抽出するアシスタントです。" +
  "与えられた本文だけを根拠にJSONを出力してください。" +
  "料理名が読み取れない場合は本文の内容から適切な短い名前を推測してください。" +
  "材料の分量が本文に書かれていない場合、quantityは空文字にしてください。" +
  "材料が1つも見つからない場合はingredientsを空配列にしてください。";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
        },
        required: ["name", "quantity"],
      },
    },
  },
  required: ["title", "ingredients"],
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

// output_text は便宜フィールドで、thinking_level を使うと省略され steps だけが
// 返ってくることが実疎通で確認できた（thought ステップの後に model_output ステップが来る）。
// 両方に対応する。
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

const draftSchema = z.object({
  title: z.string(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
    }),
  ),
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
