import { describe, expect, it } from "vitest";
import {
  ageInMonths,
  defaultCategoryFor,
  selectPrograms,
} from "@/features/programs/filter";
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

describe("ageInMonths", () => {
  it("counts completed months only", () => {
    expect(ageInMonths("2026-05-20", "2026-09-19")).toBe(3);
    expect(ageInMonths("2026-05-20", "2026-09-20")).toBe(4);
  });

  it("crosses years", () => {
    expect(ageInMonths("2025-11-30", "2026-01-30")).toBe(2);
  });

  it("is 0 on the birth date", () => {
    expect(ageInMonths("2026-09-13", "2026-09-13")).toBe(0);
  });

  it("is null before birth", () => {
    expect(ageInMonths("2026-10-01", "2026-09-13")).toBeNull();
  });
});

describe("defaultCategoryFor", () => {
  it("selects 妊娠・出産 before birth and everything after", () => {
    expect(defaultCategoryFor(null)).toBe("002");
    expect(defaultCategoryFor(0)).toBe("all");
  });
});

describe("selectPrograms", () => {
  it("applies min <= age < max, treating null as unbounded", () => {
    const childAllowance = program({ ageMinMonths: 0, ageMaxMonths: 36 });
    const checkup = program({
      shortName: "3〜4か月健診",
      ageMinMonths: 3,
      ageMaxMonths: 5,
    });
    const open = program({ shortName: "児童館" });
    const programs = [childAllowance, checkup, open];

    expect(
      selectPrograms(programs, { ageMonths: 4, category: "all" }).map(
        (p) => p.id,
      ),
    ).toEqual([childAllowance.id, checkup.id, open.id]);
    expect(
      selectPrograms(programs, { ageMonths: 5, category: "all" }).map(
        (p) => p.id,
      ),
    ).toEqual([childAllowance.id, open.id]);
    expect(
      selectPrograms(programs, { ageMonths: 36, category: "all" }).map(
        (p) => p.id,
      ),
    ).toEqual([open.id]);
  });

  it("does not filter by age when the child is not born yet", () => {
    const programs = [program({ ageMinMonths: 3, ageMaxMonths: 5 })];
    expect(
      selectPrograms(programs, { ageMonths: null, category: "all" }),
    ).toHaveLength(1);
  });

  it("filters by category", () => {
    const pregnancy = program({ categoryCodes: ["002"] });
    const both = program({ shortName: "両方", categoryCodes: ["002", "003"] });
    const nursery = program({ shortName: "保育", categoryCodes: ["004"] });
    expect(
      selectPrograms([pregnancy, both, nursery], {
        ageMonths: null,
        category: "002",
      }).map((p) => p.id),
    ).toEqual([pregnancy.id, both.id]);
  });

  it("includes programs for pregnant people (target 086) in 妊娠・出産", () => {
    const pregnancyCheckup = program({
      shortName: "妊婦歯科健診",
      categoryCodes: ["027"],
      targetCodes: ["086"],
    });
    const childCheckup = program({
      shortName: "乳幼児健診",
      categoryCodes: ["027"],
      targetCodes: ["087"],
    });
    const programs = [pregnancyCheckup, childCheckup];
    expect(
      selectPrograms(programs, { ageMonths: null, category: "002" }).map(
        (p) => p.id,
      ),
    ).toEqual([pregnancyCheckup.id]);
    // 086 で広げるのは「妊娠・出産」だけ
    expect(
      selectPrograms(programs, { ageMonths: null, category: "003" }),
    ).toHaveLength(0);
  });

  it("merges rows with the same area, title and page, keeping the first", () => {
    // サンプル市の産後ケア事業は日帰り型・宿泊型などが同じ呼び名・同じページで4行ある
    const first = program({ shortName: "産後ケア事業" });
    const duplicate = program({ shortName: "産後ケア事業" });
    const otherArea = program({
      shortName: "産後ケア事業",
      areaCode: "130001",
    });
    const otherPage = program({
      shortName: "産後ケア事業",
      sourceUrl: "https://example.test/other",
    });
    expect(
      selectPrograms([first, duplicate, otherArea, otherPage], {
        ageMonths: null,
        category: "all",
      }).map((p) => p.id),
    ).toEqual([first.id, otherArea.id, otherPage.id]);
  });

  it("merges by the displayed title, falling back to the canonical name", () => {
    const a = program({ canonicalName: "児童館" });
    const b = program({ canonicalName: "児童館" });
    expect(
      selectPrograms([a, b], { ageMonths: null, category: "all" }),
    ).toHaveLength(1);
  });
});
