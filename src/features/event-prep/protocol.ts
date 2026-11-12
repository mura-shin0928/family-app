import { z } from "zod";
import type { CatalogTiming } from "@/features/life-events/types";
import { isHttpUrl } from "@/lib/url";
import type { PrepAnswer, PrepContext, PrepItem, PrepQuestion } from "./types";

// 一次情報を確認済み（2026-11時点）: https://ai.google.dev/gemini-api/docs/google-search
// 検索と構造化出力の併用は Gemini 3 以降（Preview）。
export const EVENT_PREP_MODEL = "gemini-3.8-flash";
export const EVENT_PREP_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

export const UNDECIDED_OPTION = "まだ決めていない";
export const MAX_QUESTIONS = 3;
export const MAX_ITEMS = 12;

const MAX_TITLE_LENGTH = 100;
const MAX_REASON_LENGTH = 200;
const MAX_OFFSET_DAYS = 3650;

const COMMON_INSTRUCTION =
  "あなたは日本の子育て家庭が、ライフイベントの準備を進めるのを手伝うアシスタントです。" +
  "家庭の事情は与えられた情報だけを前提にし、名前などの個人情報は推測しないでください。";

const QUESTIONS_INSTRUCTION =
  COMMON_INSTRUCTION +
  "これから、このイベントのためにやること・決めることを提案します。その前に、" +
  "家庭によって答えが分かれ、答えによって提案の中身が変わる問いを1〜3問だけ作ってください。" +
  "各問には短い選択肢を2〜5個付けてください。「まだ決めていない」は選択肢に入れないでください。";

const PLAN_INSTRUCTION =
  COMMON_INSTRUCTION +
  "このイベントのために、事前にやること・決めることを、時期の早い順に最大12件挙げてください。" +
  "「〇〇を決める」のような判断も含めてください。各項目には、なぜ要るかを一言で添えてください。" +
  "時期は基準日（birth=出生日、expected_birth=出産予定日）からの日数で、前なら負の数にしてください。" +
  "基準日が与えられていないか、時期が決められない項目は anchor と offsetDays を null にしてください。" +
  "kind は期限があるなら deadline、目安なら around にしてください。" +
  "自治体の手続き・神社・店・サービスなど具体的な情報は、検索で確かめたものだけを挙げ、" +
  "根拠にしたページの URL を sourceUrl に入れてください。無ければ null にしてください。";

const QUESTIONS_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["text", "options"],
      },
    },
  },
  required: ["questions"],
} as const;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          kind: { type: "string", enum: ["deadline", "around"] },
          anchor: {
            type: ["string", "null"],
            enum: ["birth", "expected_birth", null],
          },
          offsetDays: { type: ["integer", "null"] },
          sourceUrl: { type: ["string", "null"] },
        },
        required: [
          "title",
          "reason",
          "kind",
          "anchor",
          "offsetDays",
          "sourceUrl",
        ],
      },
    },
  },
  required: ["items"],
} as const;

function describeContext(ctx: PrepContext): string {
  const lines = [
    `イベント: ${ctx.subject.title}`,
    ctx.subject.summary && `説明: ${ctx.subject.summary}`,
    ctx.subject.note && `補足: ${ctx.subject.note}`,
    `今日: ${ctx.today}`,
    ctx.childStage && `子の時期: ${ctx.childStage}`,
    `出生日: ${ctx.child.birthDate ?? "未入力"}`,
    `出産予定日: ${ctx.child.expectedBirthDate ?? "未入力"}`,
    `住んでいる自治体: ${ctx.municipalityName ?? "未設定"}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function requestBody(
  instruction: string,
  input: string,
  schema: object,
  extra: object = {},
) {
  return {
    model: EVENT_PREP_MODEL,
    input,
    system_instruction: instruction,
    store: false,
    generation_config: { temperature: 0.3, thinking_level: "low" },
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema,
    },
    ...extra,
  };
}

export function buildQuestionsRequestBody(ctx: PrepContext) {
  return requestBody(
    QUESTIONS_INSTRUCTION,
    describeContext(ctx),
    QUESTIONS_SCHEMA,
  );
}

export function buildPlanRequestBody(ctx: PrepContext, answers: PrepAnswer[]) {
  const answerLines = answers.map((a) => `- ${a.question}: ${a.answer}`);
  const input = [describeContext(ctx), "質問への答え:", ...answerLines].join(
    "\n",
  );
  return requestBody(PLAN_INSTRUCTION, input, PLAN_SCHEMA, {
    tools: [{ type: "google_search" }],
  });
}

const textBlockSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
  annotations: z
    .array(z.object({ type: z.string(), url: z.string().optional() }))
    .optional(),
});

const envelopeSchema = z.object({
  steps: z.array(
    z.object({
      type: z.string(),
      content: z.array(textBlockSchema).optional(),
    }),
  ),
});

/** model_output の本文と、そこに付いた引用の URL。形が違えば null。 */
function readModelOutput(
  json: unknown,
): { text: string; citedUrls: Set<string> } | null {
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return null;
  const blocks = envelope.data.steps
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((block) => block.type === "text");
  const text = blocks.map((block) => block.text ?? "").join("");
  if (text === "") return null;
  const citedUrls = new Set(
    blocks.flatMap((block) =>
      (block.annotations ?? [])
        .filter((a) => a.type === "url_citation" && a.url)
        .map((a) => a.url as string),
    ),
  );
  return { text, citedUrls };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function truncate(text: string, max: number): string {
  return Array.from(text).slice(0, max).join("");
}

const questionsSchema = z.object({
  questions: z.array(
    z.object({ text: z.string(), options: z.array(z.string()) }),
  ),
});

/** 1〜3問の質問。各問の末尾に「まだ決めていない」を足す。使える問が無ければ null。 */
export function parseQuestions(json: unknown): PrepQuestion[] | null {
  const output = readModelOutput(json);
  if (!output) return null;
  const parsed = questionsSchema.safeParse(parseJson(output.text));
  if (!parsed.success) return null;

  const questions: PrepQuestion[] = [];
  for (const raw of parsed.data.questions) {
    const text = raw.text.trim();
    const options = [...new Set(raw.options.map((o) => o.trim()))].filter(
      (o) => o !== "" && o !== UNDECIDED_OPTION,
    );
    if (text === "" || options.length < 2) continue;
    questions.push({ text, options: [...options, UNDECIDED_OPTION] });
    if (questions.length === MAX_QUESTIONS) break;
  }
  return questions.length > 0 ? questions : null;
}

const planSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      kind: z.enum(["deadline", "around"]).catch("around"),
      anchor: z.enum(["birth", "expected_birth"]).nullable().catch(null),
      offsetDays: z.number().int().nullable().catch(null),
      sourceUrl: z.string().nullable().catch(null),
    }),
  ),
});

/** 提案の一覧（最大12件）。sourceUrl は引用にある http(s) の URL だけ残す。 */
export function parsePlan(json: unknown): PrepItem[] | null {
  const output = readModelOutput(json);
  if (!output) return null;
  const parsed = planSchema.safeParse(parseJson(output.text));
  if (!parsed.success) return null;

  const items: PrepItem[] = [];
  for (const raw of parsed.data.items) {
    const title = truncate(raw.title.trim(), MAX_TITLE_LENGTH);
    if (title === "") continue;
    const timing: CatalogTiming | null =
      raw.anchor !== null &&
      raw.offsetDays !== null &&
      Math.abs(raw.offsetDays) <= MAX_OFFSET_DAYS
        ? { kind: raw.kind, anchor: raw.anchor, offsetDays: raw.offsetDays }
        : null;
    const sourceUrl =
      raw.sourceUrl !== null &&
      output.citedUrls.has(raw.sourceUrl) &&
      isHttpUrl(raw.sourceUrl)
        ? raw.sourceUrl
        : null;
    items.push({
      title,
      reason: truncate(raw.reason.trim(), MAX_REASON_LENGTH),
      timing,
      sourceUrl,
    });
    if (items.length === MAX_ITEMS) break;
  }
  return items;
}
