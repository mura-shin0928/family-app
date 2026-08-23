import { describe, expect, it } from "vitest";
import {
  matchProceduresForItem,
  resolveProcedureDeadline,
  resolveTemplateDeadline,
} from "@/features/procedures/deadline";

describe("resolveTemplateDeadline", () => {
  it("adds offsetDays to birth_date when anchorEvent is birth", () => {
    // 実測: 小金井市の出生届は「生まれた日を1日目として14日以内」= birth+13日。
    expect(
      resolveTemplateDeadline(
        { anchorEvent: "birth", offsetDays: 13 },
        { birthDate: "2026-08-20", expectedBirthDate: null },
      ),
    ).toBe("2026-09-02");
  });

  it("supports a negative offsetDays before expected_birth_date", () => {
    expect(
      resolveTemplateDeadline(
        { anchorEvent: "expected_birth", offsetDays: -30 },
        { birthDate: null, expectedBirthDate: "2026-09-01" },
      ),
    ).toBe("2026-08-02");
  });

  it("returns null when the item has no anchorEvent (free-form item)", () => {
    expect(
      resolveTemplateDeadline(
        { anchorEvent: null, offsetDays: null },
        { birthDate: "2026-08-20", expectedBirthDate: null },
      ),
    ).toBeNull();
  });

  it("returns null when the child's anchor date is not entered yet", () => {
    expect(
      resolveTemplateDeadline(
        { anchorEvent: "birth", offsetDays: 13 },
        { birthDate: null, expectedBirthDate: "2026-09-01" },
      ),
    ).toBeNull();
  });
});

describe("resolveProcedureDeadline", () => {
  const base = {
    deadlineOn: null,
    offsetCount: null,
    offsetCounting: null,
    windowFromDays: null,
    windowToDays: null,
  };

  it("resolves a fixed deadline as-is regardless of the child's dates", () => {
    expect(
      resolveProcedureDeadline(
        {
          ...base,
          deadlineKind: "fixed",
          deadlineOn: "2026-12-01",
          anchorEvent: null,
        },
        { birthDate: null, expectedBirthDate: null },
      ),
    ).toEqual({ on: "2026-12-01", windowFrom: null, windowTo: null });
  });

  it("resolves inclusive counting as anchor + (offsetCount - 1) (14日以内 = 生まれた日を1日目)", () => {
    expect(
      resolveProcedureDeadline(
        {
          ...base,
          deadlineKind: "relative",
          anchorEvent: "birth",
          offsetCount: 14,
          offsetCounting: "inclusive",
        },
        { birthDate: "2026-08-20", expectedBirthDate: null },
      ),
    ).toEqual({ on: "2026-09-02", windowFrom: null, windowTo: null });
  });

  it("resolves exclusive counting as anchor + offsetCount", () => {
    expect(
      resolveProcedureDeadline(
        {
          ...base,
          deadlineKind: "relative",
          anchorEvent: "birth",
          offsetCount: 14,
          offsetCounting: "exclusive",
        },
        { birthDate: "2026-08-20", expectedBirthDate: null },
      ),
    ).toEqual({ on: "2026-09-03", windowFrom: null, windowTo: null });
  });

  it("falls back to inclusive (the earlier date) when offsetCounting is unknown", () => {
    expect(
      resolveProcedureDeadline(
        {
          ...base,
          deadlineKind: "relative",
          anchorEvent: "birth",
          offsetCount: 14,
          offsetCounting: "unknown",
        },
        { birthDate: "2026-08-20", expectedBirthDate: null },
      ),
    ).toEqual({ on: "2026-09-02", windowFrom: null, windowTo: null });
  });

  it("resolves a recommended window", () => {
    expect(
      resolveProcedureDeadline(
        {
          ...base,
          deadlineKind: "recommended",
          anchorEvent: "expected_birth",
          windowFromDays: -30,
          windowToDays: -10,
        },
        { birthDate: null, expectedBirthDate: "2026-09-01" },
      ),
    ).toEqual({ on: null, windowFrom: "2026-08-02", windowTo: "2026-08-22" });
  });

  it("returns no date when the anchor date is missing", () => {
    expect(
      resolveProcedureDeadline(
        {
          ...base,
          deadlineKind: "relative",
          anchorEvent: "birth",
          offsetCount: 14,
          offsetCounting: "inclusive",
        },
        { birthDate: null, expectedBirthDate: null },
      ),
    ).toEqual({ on: null, windowFrom: null, windowTo: null });
  });
});

describe("matchProceduresForItem", () => {
  const procedures: {
    category: "birth_registration" | "child_allowance";
    areaCode: string | null;
    status: "published" | "draft";
  }[] = [
    {
      category: "birth_registration",
      areaCode: "13210",
      status: "published" as const,
    },
    {
      category: "birth_registration",
      areaCode: "13",
      status: "published" as const,
    },
    {
      category: "birth_registration",
      areaCode: null,
      status: "published" as const,
    },
    {
      category: "child_allowance",
      areaCode: "13210",
      status: "published" as const,
    },
    // 未確認(draft)や別自治体は対象外
    {
      category: "birth_registration",
      areaCode: "13210",
      status: "draft" as const,
    },
    {
      category: "birth_registration",
      areaCode: "14100",
      status: "published" as const,
    },
  ];

  it("returns published procedures matching category and area_code prefix, most specific first", () => {
    const result = matchProceduresForItem(
      "birth_registration",
      procedures,
      "13210",
    );
    expect(result.map((p) => p.areaCode)).toEqual(["13210", "13", null]);
  });

  it("excludes draft procedures and other municipalities' procedures", () => {
    const result = matchProceduresForItem(
      "birth_registration",
      procedures,
      "13210",
    );
    expect(result).toHaveLength(3);
  });

  it("returns an empty array when the item has no category (free-form item)", () => {
    expect(matchProceduresForItem(null, procedures, "13210")).toEqual([]);
  });
});
