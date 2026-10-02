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
    categoryCodes: ["003"],
    targetCodes: ["087"],
    ageMinMonths: null,
    ageMaxMonths: null,
    ...overrides,
  };
}

describe("programToCatalogItem", () => {
  it("fills the fixed fields", () => {
    const p = program({ id: "abc", shortName: "呼び名" });
    expect(programToCatalogItem(p)).toEqual({
      key: "program:abc",
      kind: "birth",
      title: "呼び名",
      summary: "",
      note: null,
      aliases: ["標準名"],
      timing: null,
      url: "https://example.test/page",
    });
  });

  it("has no aliases without shortName", () => {
    expect(programToCatalogItem(program({})).aliases).toEqual([]);
  });

  it("maps category 002 to pregnancy", () => {
    expect(
      programToCatalogItem(program({ categoryCodes: ["002", "003"] })).kind,
    ).toBe("pregnancy");
  });

  it("maps target 086 alone to pregnancy", () => {
    expect(
      programToCatalogItem(
        program({ categoryCodes: ["003"], targetCodes: ["086"] }),
      ).kind,
    ).toBe("pregnancy");
  });

  it("maps 004 to nursery", () => {
    expect(programToCatalogItem(program({ categoryCodes: ["004"] })).kind).toBe(
      "nursery",
    );
  });

  it("maps 003 only to birth", () => {
    expect(programToCatalogItem(program({ categoryCodes: ["003"] })).kind).toBe(
      "birth",
    );
  });
});

describe("programsToCatalog", () => {
  it("collapses duplicate pages into one item", () => {
    const programs = [
      program({ id: "a", canonicalName: "産後ケア" }),
      program({ id: "b", canonicalName: "産後ケア" }),
    ];
    const items = programsToCatalog(programs, null);
    expect(items.map((i) => i.key)).toEqual(["program:a"]);
  });

  it("filters by age", () => {
    const programs = [program({ id: "a", ageMaxMonths: 12 })];
    expect(programsToCatalog(programs, 24)).toEqual([]);
  });
});
