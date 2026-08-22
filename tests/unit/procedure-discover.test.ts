import { describe, expect, it } from "vitest";
import {
  classifyCandidate,
  extractLinks,
  inferAreaCode,
  isLikelyExcluded,
  matchesSelectedLabels,
  PROCEDURE_LABELS,
} from "@/features/procedures/discover";
import {
  isPathAllowed,
  parseDisallowRules,
} from "@/features/procedures/robots";

describe("classifyCandidate", () => {
  it("classifies short main text as index", () => {
    expect(classifyCandidate({ text: "a".repeat(100), linkCount: 5 })).toBe(
      "index",
    );
  });

  it("classifies high link density as index even with long text", () => {
    // 東京都「子供家庭」相当（4176字・218リンク → 19.2字/リンク）
    expect(classifyCandidate({ text: "a".repeat(4176), linkCount: 218 })).toBe(
      "index",
    );
  });

  it("classifies long low-density text as procedure", () => {
    // 小金井市「出生届」相当（2465字・33リンク → 74.7字/リンク）
    expect(classifyCandidate({ text: "a".repeat(2465), linkCount: 33 })).toBe(
      "procedure",
    );
  });

  it("does not divide by zero when there are no links", () => {
    expect(classifyCandidate({ text: "a".repeat(1000), linkCount: 0 })).toBe(
      "procedure",
    );
  });
});

describe("isLikelyExcluded", () => {
  it("does not exclude titles with a procedure keyword", () => {
    expect(isLikelyExcluded("出生届の手続き")).toBe(false);
    expect(isLikelyExcluded("児童手当のご案内")).toBe(false);
  });

  it("excludes titles that only match noise keywords", () => {
    expect(isLikelyExcluded("子ども・子育て会議 第3回審議会")).toBe(true);
    expect(isLikelyExcluded("〇〇計画の策定について")).toBe(true);
  });

  it("does not exclude titles with neither keyword set", () => {
    expect(isLikelyExcluded("妊娠・出産")).toBe(false);
  });

  it("prefers the include keyword when both are present", () => {
    expect(isLikelyExcluded("児童手当に関する審議会の報告")).toBe(false);
  });
});

describe("inferAreaCode", () => {
  it("resolves the known koganei city host", () => {
    expect(inferAreaCode("www.city.koganei.lg.jp", null)).toBe("13210");
  });

  it("resolves tokyo metro hosts", () => {
    expect(inferAreaCode("www.fukushi.metro.tokyo.lg.jp", null)).toBe("13");
  });

  it("resolves pref.tokyo.lg.jp hosts", () => {
    expect(inferAreaCode("www.pref.tokyo.lg.jp", "13210")).toBe("13");
  });

  it("resolves national go.jp hosts to null regardless of fallback", () => {
    expect(inferAreaCode("www.mhlw.go.jp", "13210")).toBeNull();
  });

  it("falls back to the caller-supplied value for unknown hosts", () => {
    expect(inferAreaCode("example.com", "13210")).toBe("13210");
    expect(inferAreaCode("example.com", null)).toBeNull();
  });

  it("does not guess codes for unmapped municipalities", () => {
    expect(inferAreaCode("www.city.mitaka.lg.jp", "13210")).toBe("13210");
  });
});

describe("matchesSelectedLabels", () => {
  it("treats selecting every label as no filter", () => {
    expect(matchesSelectedLabels("審議会だより", [...PROCEDURE_LABELS])).toBe(
      true,
    );
  });

  it("matches when the title contains a selected label", () => {
    expect(matchesSelectedLabels("児童手当のご案内", ["手当"])).toBe(true);
  });

  it("does not match when the title has no selected label", () => {
    expect(matchesSelectedLabels("児童手当のご案内", ["健診"])).toBe(false);
  });
});

describe("extractLinks", () => {
  const base = "https://www.city.koganei.lg.jp/kosodatekyoiku/433/index.html";

  it("resolves relative hrefs against the base URL", () => {
    const html = `<main><a href="/kurashi/410/zyumininkankoseki/412/">出生届</a></main>`;
    expect(extractLinks(html, base)).toEqual([
      {
        url: "https://www.city.koganei.lg.jp/kurashi/410/zyumininkankoseki/412/",
        text: "出生届",
      },
    ]);
  });

  it("drops cross-host links", () => {
    const html = `<main><a href="https://www.fukushi.metro.tokyo.lg.jp/kodomo">都</a></main>`;
    expect(extractLinks(html, base)).toEqual([]);
  });

  it("drops mailto/tel/javascript/anchor-only hrefs", () => {
    const html = `
      <main>
        <a href="mailto:foo@example.com">連絡</a>
        <a href="tel:0123456789">電話</a>
        <a href="javascript:void(0)">JS</a>
        <a href="#top">ページ内</a>
      </main>`;
    expect(extractLinks(html, base)).toEqual([]);
  });

  it("dedupes links that only differ by hash", () => {
    const html = `
      <main>
        <a href="/a/">A</a>
        <a href="/a/#section">A(別アンカー)</a>
      </main>`;
    expect(extractLinks(html, base)).toHaveLength(1);
  });

  it("only reads links inside <main>, ignoring global nav", () => {
    const html = `
      <nav><a href="/gomi/">ごみ・リサイクル</a></nav>
      <main><a href="/kosodate/1/">子育て</a></main>`;
    expect(extractLinks(html, base)).toEqual([
      { url: "https://www.city.koganei.lg.jp/kosodate/1/", text: "子育て" },
    ]);
  });

  it("strips tags from the anchor text", () => {
    const html = `<main><a href="/a/"><span>出生届</span>（重要）</a></main>`;
    expect(extractLinks(html, base)[0]?.text).toBe("出生届 （重要）");
  });
});

describe("robots.txt parsing", () => {
  it("collects Disallow rules only from the wildcard user-agent block", () => {
    const robotsTxt = [
      "User-agent: GoogleBot",
      "Disallow: /only-google/",
      "",
      "User-agent: *",
      "Disallow: /private/",
      "Disallow: /tmp/",
      "Allow: /tmp/public/",
    ].join("\n");

    expect(parseDisallowRules(robotsTxt)).toEqual(["/private/", "/tmp/"]);
  });

  it("ignores comments and blank lines", () => {
    const robotsTxt = [
      "# comment",
      "User-agent: *",
      "  # another comment",
      "Disallow: /x/",
    ].join("\n");
    expect(parseDisallowRules(robotsTxt)).toEqual(["/x/"]);
  });

  it("treats a missing wildcard block as allow-all", () => {
    const robotsTxt = "User-agent: GoogleBot\nDisallow: /\n";
    expect(parseDisallowRules(robotsTxt)).toEqual([]);
  });
});

describe("isPathAllowed", () => {
  it("allows paths with no matching rule", () => {
    expect(isPathAllowed(["/private/"], "/kosodate/433/")).toBe(true);
  });

  it("disallows paths matching a rule prefix", () => {
    expect(isPathAllowed(["/private/"], "/private/secret.html")).toBe(false);
  });

  it("allows everything when there are no rules", () => {
    expect(isPathAllowed([], "/anything")).toBe(true);
  });
});
