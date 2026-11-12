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
    sourceUrl: null,
    ...overrides,
  };
}

describe("parsePlan", () => {
  it("項目を取り、timing はモデルの kind と基準日からの日数にする", () => {
    const items = parsePlan(response({ items: [planItem()] }));
    expect(items).toEqual([
      {
        title: "祈祷を受ける神社を決める",
        reason: "予約が要る神社がある",
        timing: { kind: "around", anchor: "birth", offsetDays: 20 },
        sourceUrl: null,
      },
    ]);
  });

  it("sourceUrl は引用にある URL だけ残す", () => {
    const cited = "https://www.city.koganei.lg.jp/page.html";
    const items = parsePlan(
      response(
        {
          items: [
            planItem({ sourceUrl: cited }),
            planItem({ sourceUrl: "https://example.com/made-up" }),
          ],
        },
        [cited],
      ),
    );
    expect(items?.map((i) => i.sourceUrl)).toEqual([cited, null]);
  });

  it("http(s) でない URL は引用にあっても null にする", () => {
    const items = parsePlan(
      response({ items: [planItem({ sourceUrl: "javascript:alert(1)" })] }, [
        "javascript:alert(1)",
      ]),
    );
    expect(items?.[0]?.sourceUrl).toBeNull();
  });

  it("anchor か offsetDays が欠けるか、|offsetDays| が 3650 を超えると timing: null", () => {
    const items = parsePlan(
      response({
        items: [
          planItem({ anchor: null }),
          planItem({ offsetDays: null }),
          planItem({ offsetDays: 3651 }),
          planItem({ offsetDays: -3650 }),
        ],
      }),
    );
    expect(items?.map((i) => i.timing)).toEqual([
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
    expect(parsePlan(response({ items: many }))).toHaveLength(MAX_ITEMS);

    const items = parsePlan(
      response({
        items: [
          planItem({ title: "  " }),
          planItem({ title: "あ".repeat(150), reason: "い".repeat(300) }),
        ],
      }),
    );
    expect(items).toHaveLength(1);
    expect(items?.[0]?.title).toHaveLength(100);
    expect(items?.[0]?.reason).toHaveLength(200);
  });

  it("items が空なら []、想定外の形は null", () => {
    expect(parsePlan(response({ items: [] }))).toEqual([]);
    expect(parsePlan(response({ list: [] }))).toBeNull();
    expect(parsePlan(response(null, [], "{"))).toBeNull();
  });
});
