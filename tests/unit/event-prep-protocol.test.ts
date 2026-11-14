import { describe, expect, it } from "vitest";
import {
  buildPlanRequestBody,
  buildQuestionsRequestBody,
  MAX_ITEMS,
  parsePlan,
  parseQuestions,
  UNDECIDED_OPTION,
} from "@/features/event-prep/protocol";
import type { PrepContext } from "@/features/event-prep/types";
import planFixture from "../fixtures/event-prep/plan-response.json";
import questionsFixture from "../fixtures/event-prep/questions-response.json";

const ctx: PrepContext = {
  subject: {
    title: "お宮参り",
    summary: "生後1か月ごろに神社へお参りする。",
    note: null,
  },
  childStage: "出生日 2026/11/1・生後0か月",
  child: { birthDate: "2026-11-01", expectedBirthDate: null },
  municipalityName: "小金井市",
  today: "2026-11-12",
};

/** Interactions API の応答の形（steps の model_output に JSON の本文と引用）。 */
function response(
  output: unknown,
  citations: string[] = [],
  raw?: string,
): unknown {
  return {
    steps: [
      { type: "thought" },
      {
        type: "model_output",
        content: [
          {
            type: "text",
            text: raw ?? JSON.stringify(output),
            annotations: citations.map((url, i) => ({
              type: "url_citation",
              url,
              title: `page ${i}`,
              start_index: 0,
              end_index: 1,
            })),
          },
        ],
      },
    ],
  };
}

describe("buildQuestionsRequestBody", () => {
  it("検索ツールを付けず、イベント名と自治体名を渡す", () => {
    const body = buildQuestionsRequestBody(ctx);
    expect(body).toMatchObject({ model: "gemini-3.8-flash", store: false });
    expect(body).not.toHaveProperty("tools");
    expect(JSON.stringify(body)).toContain("お宮参り");
    expect(JSON.stringify(body)).toContain("小金井市");
  });
});

describe("buildPlanRequestBody", () => {
  it("google_search を付け、答えと出生日を渡す", () => {
    const body = buildPlanRequestBody(ctx, [
      { question: "両家を呼びますか", answer: "呼ぶ" },
    ]);
    expect(body).toMatchObject({
      model: "gemini-3.8-flash",
      store: false,
      tools: [{ type: "google_search" }],
    });
    expect(JSON.stringify(body)).toContain("両家を呼びますか");
    expect(JSON.stringify(body)).toContain("2026-11-01");
  });
});

describe("parseQuestions", () => {
  it("各問の末尾に「まだ決めていない」を足す", () => {
    const qs = parseQuestions(
      response({
        questions: [
          { text: "両家を呼びますか", options: ["呼ぶ", "呼ばない"] },
          { text: "写真は", options: ["スタジオ", "出張", "撮らない"] },
        ],
      }),
    );
    expect(qs).toEqual([
      {
        text: "両家を呼びますか",
        options: ["呼ぶ", "呼ばない", UNDECIDED_OPTION],
      },
      {
        text: "写真は",
        options: ["スタジオ", "出張", "撮らない", UNDECIDED_OPTION],
      },
    ]);
  });

  it("モデルが「まだ決めていない」を返しても重複させない", () => {
    const qs = parseQuestions(
      response({
        questions: [{ text: "Q", options: ["まだ決めていない", "A", "B"] }],
      }),
    );
    expect(qs?.[0]?.options).toEqual(["A", "B", UNDECIDED_OPTION]);
  });

  it("4 問以上は先頭 3 問に切る", () => {
    const questions = Array.from({ length: 5 }, (_, i) => ({
      text: `Q${i}`,
      options: ["A", "B"],
    }));
    const qs = parseQuestions(response({ questions }));
    expect(qs?.map((q) => q.text)).toEqual(["Q0", "Q1", "Q2"]);
  });

  it("選択肢が 2 個未満の問は落とし、残りが 0 問なら null", () => {
    expect(
      parseQuestions(
        response({
          questions: [
            { text: "Q0", options: ["A"] },
            { text: "Q1", options: ["A", "B"] },
          ],
        }),
      )?.map((q) => q.text),
    ).toEqual(["Q1"]);
    expect(
      parseQuestions(response({ questions: [{ text: "Q", options: ["A"] }] })),
    ).toBeNull();
  });

  it("JSON でない本文・想定外の形は null", () => {
    expect(parseQuestions(response(null, [], "not json"))).toBeNull();
    expect(parseQuestions(response({ foo: 1 }))).toBeNull();
    expect(parseQuestions({ unexpected: true })).toBeNull();
  });
});

function planItem(overrides: Record<string, unknown> = {}) {
  return {
    title: "祈祷を受ける神社を決める",
    reason: "予約が要る神社がある",
    kind: "around",
    anchor: "birth",
    offsetDays: 20,
    ...overrides,
  };
}

/** ② の応答。検索の結果（検索候補の HTML）を先に置く。 */
function planResponse(output: unknown, suggestions: string[] = []): unknown {
  const base = response(output) as { steps: unknown[] };
  return {
    steps: [
      ...suggestions.map((html) => ({
        type: "google_search_result",
        result: [{ search_suggestions: html }],
      })),
      ...base.steps,
    ],
  };
}

describe("parsePlan", () => {
  it("項目を取り、timing はモデルの kind と基準日からの日数にする", () => {
    const plan = parsePlan(planResponse({ items: [planItem()] }));
    expect(plan?.items).toEqual([
      {
        title: "祈祷を受ける神社を決める",
        reason: "予約が要る神社がある",
        timing: { kind: "around", anchor: "birth", offsetDays: 20 },
      },
    ]);
  });

  it("検索候補の HTML を集め、検索していなければ null", () => {
    expect(
      parsePlan(planResponse({ items: [] }, ["<a>1</a>", "<a>2</a>"]))
        ?.searchSuggestions,
    ).toBe("<a>1</a><a>2</a>");
    expect(
      parsePlan(planResponse({ items: [] }))?.searchSuggestions,
    ).toBeNull();
  });

  it("anchor か offsetDays が欠けるか、|offsetDays| が 3650 を超えると timing: null", () => {
    const plan = parsePlan(
      planResponse({
        items: [
          planItem({ anchor: null }),
          planItem({ offsetDays: null }),
          planItem({ offsetDays: 3651 }),
          planItem({ offsetDays: -3650 }),
        ],
      }),
    );
    expect(plan?.items.map((i) => i.timing)).toEqual([
      null,
      null,
      null,
      { kind: "around", anchor: "birth", offsetDays: -3650 },
    ]);
  });

  it("件数・空のタイトル・長さを整える", () => {
    const many = Array.from({ length: MAX_ITEMS + 3 }, (_, i) =>
      planItem({ title: `項目${i}` }),
    );
    expect(parsePlan(planResponse({ items: many }))?.items).toHaveLength(
      MAX_ITEMS,
    );

    const items = parsePlan(
      planResponse({
        items: [
          planItem({ title: "  " }),
          planItem({ title: "あ".repeat(150), reason: "い".repeat(300) }),
        ],
      }),
    )?.items;
    expect(items).toHaveLength(1);
    expect(items?.[0]?.title).toHaveLength(100);
    expect(items?.[0]?.reason).toHaveLength(200);
  });

  it("items が空なら []、想定外の形は null", () => {
    expect(parsePlan(planResponse({ items: [] }))?.items).toEqual([]);
    expect(parsePlan(planResponse({ list: [] }))).toBeNull();
    expect(parsePlan(response(null, [], "{"))).toBeNull();
  });
});

describe("実際の応答（2026-11-14 に取得）", () => {
  it("① から質問を取れる", () => {
    const qs = parseQuestions(questionsFixture);
    expect(qs).toHaveLength(3);
    for (const q of qs ?? []) expect(q.options.at(-1)).toBe(UNDECIDED_OPTION);
  });

  it("② から項目と検索候補を取れる", () => {
    const plan = parsePlan(planFixture);
    expect(plan?.items).toHaveLength(8);
    expect(plan?.items[0]?.timing).toEqual({
      kind: "around",
      anchor: "birth",
      offsetDays: 16,
    });
    expect(plan?.searchSuggestions).toContain("https://www.google.com/search");
  });
});
