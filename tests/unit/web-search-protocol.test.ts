import { describe, expect, it } from "vitest";
import { buildRequestBody, parseResults } from "@/features/web-search/protocol";

function hit(overrides: Record<string, unknown> = {}) {
  return {
    title: "産後ケア事業｜小金井市",
    url: "https://www.city.koganei.lg.jp/a.html",
    content: "抜粋",
    score: 0.9,
    ...overrides,
  };
}

describe("parseResults", () => {
  it("maps title / url / content to WebSearchResult", () => {
    expect(parseResults({ results: [hit()] })).toEqual([
      {
        title: "産後ケア事業｜小金井市",
        url: "https://www.city.koganei.lg.jp/a.html",
        snippet: "抜粋",
      },
    ]);
  });

  it("returns [] for an empty result list", () => {
    expect(parseResults({ results: [] })).toEqual([]);
  });

  it("returns null when the body is not the expected shape", () => {
    expect(parseResults({ error: "x" })).toBeNull();
    expect(parseResults(null)).toBeNull();
    expect(parseResults({ results: [{ title: 1 }] })).toBeNull();
  });

  it("trims the title and drops results whose title is blank", () => {
    expect(
      parseResults({
        results: [hit({ title: "  名前  " }), hit({ title: " 　 " })],
      }),
    ).toEqual([expect.objectContaining({ title: "名前" })]);
  });

  it("drops results whose url is not http(s)", () => {
    expect(
      parseResults({
        results: [
          hit({ url: "javascript:alert(1)" }),
          hit({ url: "ftp://x.test/a" }),
        ],
      }),
    ).toEqual([]);
  });

  it("drops results whose url is longer than 2000 characters", () => {
    expect(
      parseResults({
        results: [hit({ url: `https://x.test/${"a".repeat(2000)}` })],
      }),
    ).toEqual([]);
  });

  it("treats a missing content as an empty snippet", () => {
    const { content: _content, ...noContent } = hit();
    expect(parseResults({ results: [noContent] })).toEqual([
      expect.objectContaining({ snippet: "" }),
    ]);
  });

  it("keeps at most 10 results", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      hit({ url: `https://x.test/${i}` }),
    );
    expect(parseResults({ results: many })).toHaveLength(10);
  });
});

describe("buildRequestBody", () => {
  it("asks for 10 basic-depth results", () => {
    expect(buildRequestBody("小金井市 産後ケア")).toEqual({
      query: "小金井市 産後ケア",
      max_results: 10,
      search_depth: "basic",
    });
  });
});
