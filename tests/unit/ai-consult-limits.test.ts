import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseQuestions,
  UNDECIDED_OPTION,
} from "@/features/ai-consult/protocol";
import { addConsultTasksSchema } from "@/features/ai-consult/schema";

function response(output: unknown, citations: string[] = []): unknown {
  return {
    steps: [
      {
        type: "model_output",
        content: [
          {
            type: "text",
            text: JSON.stringify(output),
            annotations: citations.map((url) => ({
              type: "url_citation",
              url,
            })),
          },
        ],
      },
    ],
  };
}

describe("parseQuestions の長さと数", () => {
  it("長すぎる選択肢と問は落とし、選択肢は 5 個までにし、同じ問は 1 つにする", () => {
    const qs = parseQuestions(
      response({
        questions: [
          { text: "あ".repeat(201), options: ["A", "B"] },
          {
            text: "Q",
            options: ["A", "い".repeat(101), "B", "C", "D", "E", "F"],
          },
          { text: "Q", options: ["X", "Y"] },
        ],
      }),
    );
    expect(qs).toEqual([
      { text: "Q", options: ["A", "B", "C", "D", "E", UNDECIDED_OPTION] },
    ]);
  });
});

describe("addConsultTasksSchema のタイトル", () => {
  it("提案で切った 100 文字のタイトルは、絵文字を含んでも通す", () => {
    const result = addConsultTasksSchema.safeParse({
      items: [
        {
          id: randomUUID(),
          title: "🎍".repeat(100),
          dueOn: "",
          note: "",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
