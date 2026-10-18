import { describe, expect, it } from "vitest";
import {
  programsToCatalog,
  programToCatalogItem,
} from "@/features/life-events/program-catalog";
import type { Program } from "@/features/programs/types";

function program(overrides: Partial<Program>): Program {
  return {
    id: crypto.randomUUID(),
    areaCode: "999999",
    canonicalName: "標準名",
    shortName: null,
    sourceUrl: "https://example.test/page",
    url: "https://example.test/page",
    state: "active",
    checkedAt: "2026-09-21T03:20:00+09:00",
    changedAt: null,
    autoUpdate: true,
    relatedLinks: [],
    categoryCodes: ["003"],
    targetCodes: ["087"],
    ageMinMonths: null,
    ageMaxMonths: null,
    ...overrides,
  };
}

const TODAY = "2026-10-18";

describe("programToCatalogItem", () => {
  it("fills the fixed fields", () => {
    const p = program({ id: "abc", shortName: "呼び名" });
    expect(programToCatalogItem(p, TODAY)).toEqual({
      key: "program:abc",
      kind: "birth",
      title: "呼び名",
      summary: "",
      note: null,
      aliases: ["標準名"],
      timing: null,
      url: "https://example.test/page",
      link: {
        notice: null,
        checkedOn: "最終確認: 9月21日",
        relatedUrls: [],
      },
    });
  });

  it("links to the url that opens now, not the registry value", () => {
    const p = program({
      sourceUrl: "https://example.test/old",
      url: "https://example.test/new",
    });
    expect(programToCatalogItem(p, TODAY).url).toBe("https://example.test/new");
  });

  it("carries the notice for a page that could not be opened", () => {
    const p = program({
      state: "deleted",
      relatedLinks: [
        { url: "https://example.test/r", state: "active", checkedAt: null },
      ],
    });
    expect(programToCatalogItem(p, TODAY).link).toEqual({
      notice: "公式ページを開けませんでした（最終確認: 9月21日）",
      checkedOn: "最終確認: 9月21日",
      relatedUrls: ["https://example.test/r"],
    });
  });

  it("has no aliases without shortName", () => {
    expect(programToCatalogItem(program({}), TODAY).aliases).toEqual([]);
  });

  it("maps category 002 to pregnancy", () => {
    expect(
      programToCatalogItem(program({ categoryCodes: ["002", "003"] }), TODAY)
        .kind,
    ).toBe("pregnancy");
  });

  it("maps target 086 alone to pregnancy", () => {
    expect(
      programToCatalogItem(
        program({ categoryCodes: ["003"], targetCodes: ["086"] }),
        TODAY,
      ).kind,
    ).toBe("pregnancy");
  });

  it("maps 004 to nursery", () => {
    expect(
      programToCatalogItem(program({ categoryCodes: ["004"] }), TODAY).kind,
    ).toBe("nursery");
  });

  it("maps 003 only to birth", () => {
    expect(
      programToCatalogItem(program({ categoryCodes: ["003"] }), TODAY).kind,
    ).toBe("birth");
  });
});

describe("programsToCatalog", () => {
  it("collapses duplicate pages into one item", () => {
    const programs = [
      program({ id: "a", canonicalName: "産後ケア" }),
      program({ id: "b", canonicalName: "産後ケア" }),
    ];
    const items = programsToCatalog(programs, null, TODAY);
    expect(items.map((i) => i.key)).toEqual(["program:a"]);
  });

  it("filters by age", () => {
    const programs = [program({ id: "a", ageMaxMonths: 12 })];
    expect(programsToCatalog(programs, 24, TODAY)).toEqual([]);
  });
});
