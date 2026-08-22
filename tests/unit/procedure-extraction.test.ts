import { describe, expect, it } from "vitest";
import { extractMainText } from "@/features/procedures/extraction/extract-main";
import {
  buildRequestBody,
  parseOutput,
} from "@/features/procedures/extraction/protocol";

describe("extractMainText", () => {
  it("extracts only the <main> content, dropping global nav around it", () => {
    const html = `
      <html><head><title>妊娠・出産</title></head>
      <body>
        <nav>ごみ・リサイクル 下水道 友好都市三宅村</nav>
        <main class="main">
          <a id="CONT">本文ここから</a>
          <h1>出生届</h1>
          <p>生まれた日から14日以内にお届けください。</p>
        </main>
        <footer>法人番号：3000020132101</footer>
      </body></html>
    `;
    const result = extractMainText(html);
    expect(result.text).toContain("出生届");
    expect(result.text).toContain("14日以内");
    expect(result.text).not.toContain("ごみ・リサイクル");
    expect(result.text).not.toContain("法人番号");
  });

  it("falls back to the whole page when there is no <main> tag", () => {
    const html = `<html><body><p>本文のみのページ</p></body></html>`;
    const result = extractMainText(html);
    expect(result.text).toContain("本文のみのページ");
  });

  it("reads the og:title as the title", () => {
    const html = `<html><head><meta property="og:title" content="妊娠・出産"></head><body><main>本文</main></body></html>`;
    expect(extractMainText(html).title).toBe("妊娠・出産");
  });

  it("counts links found only within <main>", () => {
    const html = `
      <body>
        <nav><a href="/a">a</a><a href="/b">b</a><a href="/c">c</a></nav>
        <main><a href="/x">x</a></main>
      </body>
    `;
    expect(extractMainText(html).linkCount).toBe(1);
  });

  it("parses 更新日 with a colon (小金井市の表記)", () => {
    const html = `<main><p>更新日：2026年4月1日</p></main>`;
    expect(extractMainText(html).updatedOn).toBe("2026-04-01");
  });

  it("parses 更新日 without a colon (東京都の表記)", () => {
    const html = `<main><p>更新日 2019年9月10日</p></main>`;
    expect(extractMainText(html).updatedOn).toBe("2019-09-10");
  });

  it("returns null updatedOn when no date is present", () => {
    const html = `<main><p>本文のみ</p></main>`;
    expect(extractMainText(html).updatedOn).toBeNull();
  });
});

function draftFields(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "出生届",
    summary: "子が生まれたときに提出する届出です。",
    obligation: "required",
    obligation_quote: "生まれた日から14日以内にお届けください",
    deadline_kind: "relative",
    deadline_on: "",
    anchor_event: "birth",
    offset_count: "14",
    offset_counting: "inclusive",
    window_from_days: "",
    window_to_days: "",
    deadline_quote: "生まれた日から14日以内にお届けください",
    deadline_note: "",
    eligibility: "",
    benefits: [],
    where_to_apply: "市民課",
    documents: "母子健康手帳",
    ...overrides,
  };
}

function envelope(outputText: unknown) {
  return { output_text: JSON.stringify(outputText) };
}

describe("buildRequestBody", () => {
  it("carries the fetched text verbatim as input", () => {
    const body = buildRequestBody("出生届の本文");
    expect(body.input).toBe("出生届の本文");
  });

  it("requests structured JSON output and stateless mode", () => {
    const body = buildRequestBody("text");
    expect(body.store).toBe(false);
    expect(body.response_format.type).toBe("text");
    expect(body.response_format.mime_type).toBe("application/json");
    expect(body.response_format.schema.required).toContain("obligation_quote");
    expect(body.response_format.schema.required).toContain("deadline_quote");
  });

  it("uses a fixed system instruction that never includes caller-provided text", () => {
    const body = buildRequestBody("家族の秘密のメモ");
    expect(body.system_instruction).not.toContain("家族の秘密のメモ");
  });
});

describe("parseOutput", () => {
  it("parses a well-formed draft", () => {
    const result = parseOutput(envelope(draftFields()));
    expect(result.kind).toBe("draft");
    if (result.kind !== "draft") throw new Error("unreachable");
    expect(result.draft.title).toBe("出生届");
    expect(result.draft.obligation).toBe("required");
    expect(result.draft.deadlineKind).toBe("relative");
    expect(result.draft.anchorEvent).toBe("birth");
    expect(result.draft.offsetCount).toBe(14);
    expect(result.draft.offsetCounting).toBe("inclusive");
  });

  it("normalizes empty numeric strings to null", () => {
    const result = parseOutput(
      envelope(draftFields({ deadline_kind: "none", offset_count: "" })),
    );
    expect(result.kind).toBe("draft");
    if (result.kind !== "draft") throw new Error("unreachable");
    expect(result.draft.offsetCount).toBeNull();
  });

  it("parses benefits with quotes", () => {
    const result = parseOutput(
      envelope(
        draftFields({
          obligation: "benefit",
          benefits: [{ label: "出産育児一時金", quote: "50万円を支給します" }],
        }),
      ),
    );
    expect(result.kind).toBe("draft");
    if (result.kind !== "draft") throw new Error("unreachable");
    expect(result.draft.benefits).toEqual([
      { label: "出産育児一時金", quote: "50万円を支給します" },
    ]);
  });

  it("fails when output_text is not JSON", () => {
    expect(parseOutput({ output_text: "not json" })).toEqual({
      kind: "failed",
      reason: "invalid-response",
    });
  });

  it("fails when a required field is missing", () => {
    const { obligation, ...withoutObligation } = draftFields();
    void obligation;
    expect(parseOutput(envelope(withoutObligation))).toEqual({
      kind: "failed",
      reason: "invalid-response",
    });
  });

  it("fails when obligation is not one of the known enum values", () => {
    const result = parseOutput(
      envelope(draftFields({ obligation: "mandatory" })),
    );
    expect(result).toEqual({ kind: "failed", reason: "invalid-response" });
  });
});
