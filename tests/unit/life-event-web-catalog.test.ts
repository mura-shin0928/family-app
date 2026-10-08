import { describe, expect, it } from "vitest";
import {
  buildSearchQuery,
  shownProgramUrls,
  webCatalogKey,
  webResultsToCatalog,
} from "@/features/life-events/web-catalog";
import type { Program } from "@/features/programs/types";
import type { WebSearchResult } from "@/features/web-search/types";

function result(overrides: Partial<WebSearchResult> = {}): WebSearchResult {
  return {
    title: "産後ケア事業｜小金井市",
    url: "https://www.city.koganei.lg.jp/kosodate/sango.html",
    snippet: "抜粋",
    ...overrides,
  };
}

describe("buildSearchQuery", () => {
  it("puts the municipality name before the query", () => {
    expect(buildSearchQuery("産後ケア", "小金井市")).toBe("小金井市 産後ケア");
  });

  it("uses the query alone when no municipality is set", () => {
    expect(buildSearchQuery("産後ケア", null)).toBe("産後ケア");
  });

  it("trims the query", () => {
    expect(buildSearchQuery("  産後ケア　", "小金井市")).toBe(
      "小金井市 産後ケア",
    );
  });
});

describe("webCatalogKey", () => {
  it("is web: followed by 32 hex characters", () => {
    expect(webCatalogKey("https://x.test/a")).toMatch(/^web:[0-9a-f]{32}$/);
  });

  it("is stable for the same url and differs for another url", () => {
    expect(webCatalogKey("https://x.test/a")).toBe(
      webCatalogKey("https://x.test/a"),
    );
    expect(webCatalogKey("https://x.test/a")).not.toBe(
      webCatalogKey("https://x.test/b"),
    );
  });

  it("ignores scheme, fragment and a trailing slash", () => {
    const key = webCatalogKey("https://x.test/a");
    expect(webCatalogKey("http://x.test/a")).toBe(key);
    expect(webCatalogKey("https://x.test/a#top")).toBe(key);
    expect(webCatalogKey("https://x.test/a/")).toBe(key);
  });

  it("keeps the query string significant", () => {
    expect(webCatalogKey("https://x.test/a?id=1")).not.toBe(
      webCatalogKey("https://x.test/a?id=2"),
    );
  });

  it("stays within the catalog_key limit for a 2000-character url", () => {
    expect(
      webCatalogKey(`https://x.test/${"a".repeat(1980)}`).length,
    ).toBeLessThanOrEqual(200);
  });
});

describe("webResultsToCatalog", () => {
  it("fills the fixed fields", () => {
    expect(webResultsToCatalog([result()], [])).toEqual([
      {
        key: webCatalogKey(
          "https://www.city.koganei.lg.jp/kosodate/sango.html",
        ),
        kind: null,
        title: "産後ケア事業｜小金井市",
        summary: "抜粋",
        note: null,
        aliases: [],
        timing: null,
        url: "https://www.city.koganei.lg.jp/kosodate/sango.html",
      },
    ]);
  });

  it("cuts the title at 100 characters and the snippet at 200", () => {
    const [item] = webResultsToCatalog(
      [result({ title: "あ".repeat(150), snippet: "い".repeat(300) })],
      [],
    );
    expect(item.title).toHaveLength(100);
    expect(item.summary).toHaveLength(200);
  });

  it("drops a result whose url is already in the registry", () => {
    expect(
      webResultsToCatalog(
        [result()],
        ["https://www.city.koganei.lg.jp/kosodate/sango.html"],
      ),
    ).toEqual([]);
  });

  it("matches the registry url ignoring scheme, fragment and a trailing slash", () => {
    const results = [
      result({ url: "https://x.test/a/" }),
      result({ url: "https://x.test/b#top" }),
    ];
    expect(
      webResultsToCatalog(results, ["http://x.test/a", "https://x.test/b"]),
    ).toEqual([]);
  });

  it("keeps only the first of results that point at the same page", () => {
    const items = webResultsToCatalog(
      [
        result({ url: "https://x.test/a", title: "1つ目" }),
        result({ url: "https://x.test/a#x", title: "2つ目" }),
      ],
      [],
    );
    expect(items.map((i) => i.title)).toEqual(["1つ目"]);
  });

  it("keeps the order of the search results", () => {
    const items = webResultsToCatalog(
      [
        result({ url: "https://x.test/1" }),
        result({ url: "https://x.test/2" }),
      ],
      [],
    );
    expect(items.map((i) => i.url)).toEqual([
      "https://x.test/1",
      "https://x.test/2",
    ]);
  });
});

function program(overrides: Partial<Program>): Program {
  return {
    id: crypto.randomUUID(),
    areaCode: "999999",
    canonicalName: "標準名",
    shortName: null,
    sourceUrl: "https://example.test/page",
    categoryCodes: ["003"],
    targetCodes: ["087"],
    ageMinMonths: null,
    ageMaxMonths: null,
    ...overrides,
  };
}

describe("shownProgramUrls", () => {
  it("returns the url of a program whose name matches the query", () => {
    const programs = [
      program({ shortName: "産後ケア事業", sourceUrl: "https://x.test/a" }),
    ];
    expect(shownProgramUrls(programs, null, "産後ケア")).toEqual([
      "https://x.test/a",
    ]);
  });

  it("leaves out a program the query does not find by name", () => {
    const programs = [
      program({
        shortName: "産後家事・育児支援事業",
        sourceUrl: "https://x.test/a",
      }),
    ];
    expect(shownProgramUrls(programs, null, "産後ヘルパー")).toEqual([]);
  });

  it("leaves out a program outside the child's age", () => {
    const programs = [
      program({
        shortName: "産後ケア事業",
        sourceUrl: "https://x.test/a",
        ageMaxMonths: 12,
      }),
    ];
    expect(shownProgramUrls(programs, 24, "産後ケア")).toEqual([]);
  });
});
