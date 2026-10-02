import { describe, expect, it } from "vitest";
import {
  describeTiming,
  itemStateFor,
  matchesQuery,
  normalizeForSearch,
  resolveTargetDate,
  selectCurrentItems,
} from "@/features/life-events/search";
import type { CatalogItem, LifeEventItem } from "@/features/life-events/types";

const born = { birthDate: "2026-08-20", expectedBirthDate: "2026-08-25" };
const today = "2026-10-02";

function item(
  overrides: Partial<Omit<CatalogItem, "timing">> & {
    anchor?: "birth" | "expected_birth";
    offsetDays?: number;
    timingKind?: "deadline" | "around";
  } = {},
): CatalogItem {
  const { anchor, offsetDays, timingKind, ...rest } = overrides;
  return {
    key: "birth:x",
    kind: "birth",
    title: "項目",
    summary: "",
    note: null,
    aliases: [],
    timing:
      anchor !== undefined && offsetDays !== undefined
        ? { kind: timingKind ?? "around", anchor, offsetDays }
        : null,
    url: null,
    ...rest,
  };
}

describe("resolveTargetDate", () => {
  it("出生日基準は出生日に足す", () => {
    expect(
      resolveTargetDate(item({ anchor: "birth", offsetDays: 13 }), born),
    ).toBe("2026-09-02");
  });
  it("基準日がなければ null", () => {
    expect(
      resolveTargetDate(item({ anchor: "birth", offsetDays: 13 }), {
        birthDate: null,
        expectedBirthDate: "2026-08-25",
      }),
    ).toBeNull();
  });
  it("時期のない項目は null", () => {
    expect(resolveTargetDate(item(), born)).toBeNull();
  });
});

describe("selectCurrentItems", () => {
  it("窓は今日の30日前〜90日後を両端含む", () => {
    const at = (offsetDays: number) => item({ anchor: "birth", offsetDays });
    expect(selectCurrentItems([at(13)], born, today)).toHaveLength(1); // 09-02
    expect(selectCurrentItems([at(12)], born, today)).toHaveLength(0); // 09-01
    expect(selectCurrentItems([at(133)], born, today)).toHaveLength(1); // 12-31
    expect(selectCurrentItems([at(134)], born, today)).toHaveLength(0); // 2027-01-01
  });
  it("目安日の昇順に並べる", () => {
    const a = item({ key: "a", anchor: "birth", offsetDays: 60 });
    const b = item({ key: "b", anchor: "birth", offsetDays: 20 });
    const c = item({ key: "c", anchor: "birth", offsetDays: 40 });
    expect(
      selectCurrentItems([a, b, c], born, today).map((i) => i.key),
    ).toEqual(["b", "c", "a"]);
  });
  it("時期のない項目は出さない", () => {
    expect(selectCurrentItems([item()], born, today)).toEqual([]);
  });
  it("子に日付がなければ0件", () => {
    const all = [item({ anchor: "birth", offsetDays: 40 })];
    expect(
      selectCurrentItems(
        all,
        { birthDate: null, expectedBirthDate: null },
        today,
      ),
    ).toEqual([]);
  });
  it("expected_birth 基準の項目は、出生後も予定日から計算する", () => {
    // 予定日 08-25 + 40 = 10-04
    const e = item({ anchor: "expected_birth", offsetDays: 40 });
    expect(selectCurrentItems([e], born, today)).toHaveLength(1);
    expect(
      selectCurrentItems(
        [e],
        { birthDate: null, expectedBirthDate: "2026-08-25" },
        today,
      ),
    ).toHaveLength(1);
  });
});

describe("matchesQuery / normalizeForSearch", () => {
  it("表記揺れを吸収する", () => {
    expect(
      matchesQuery(item({ title: "ベビー用品を準備する" }), "べびー"),
    ).toBe(true);
    expect(matchesQuery(item({ title: "ＡＢＣ検査" }), "abc")).toBe(true);
    expect(
      matchesQuery(item({ title: "x", aliases: ["出生の届出"] }), "届出"),
    ).toBe(true);
  });
  it("summary にも当たり、空の query は true", () => {
    expect(
      matchesQuery(item({ title: "x", summary: "児童手当の申請" }), "手当"),
    ).toBe(true);
    expect(matchesQuery(item({ title: "x" }), "")).toBe(true);
    expect(matchesQuery(item({ title: "x" }), "zzz")).toBe(false);
  });
  it("normalizeForSearch はカタカナをひらがな・小文字にする", () => {
    expect(normalizeForSearch("ＡＢＣ ベビー")).toBe("abc べびー");
  });
});

describe("itemStateFor", () => {
  const rows: LifeEventItem[] = [
    {
      id: "1",
      childId: "c1",
      catalogKey: "birth:x",
      title: "t",
      note: null,
      status: "in_task",
      doneOn: null,
    },
    {
      id: "2",
      childId: "c2",
      catalogKey: "birth:y",
      title: "t",
      note: null,
      status: "done",
      doneOn: "2026-09-01",
    },
  ];
  it("同じ子・同じ key の行で判定する", () => {
    expect(itemStateFor("birth:x", "c1", rows)).toEqual({ status: "in_task" });
    expect(itemStateFor("birth:y", "c2", rows)).toEqual({
      status: "done",
      doneOn: "2026-09-01",
    });
  });
  it("他の子の行は見ない", () => {
    expect(itemStateFor("birth:x", "c2", rows)).toEqual({ status: "none" });
    expect(itemStateFor("birth:y", "c1", rows)).toEqual({ status: "none" });
  });
});

describe("describeTiming", () => {
  it("deadline は「までが目安」、around は「ごろが目安」", () => {
    expect(
      describeTiming(
        item({ anchor: "birth", offsetDays: 13, timingKind: "deadline" }),
        born,
      ),
    ).toBe("2026/9/2までが目安");
    expect(
      describeTiming(item({ anchor: "birth", offsetDays: 13 }), born),
    ).toBe("2026/9/2ごろが目安");
  });
  it("日付が出せなければ null", () => {
    expect(describeTiming(item(), born)).toBeNull();
  });
});
