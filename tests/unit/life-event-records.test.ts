import { describe, expect, it } from "vitest";
import {
  formatMonthDay,
  groupDoneItemsByMonth,
  sortDoneItems,
  splitNoteByUrl,
} from "@/features/life-events/records";
import type { LifeEventItem } from "@/features/life-events/types";

function makeItem(
  overrides: Partial<LifeEventItem> & { id: string },
): LifeEventItem {
  return {
    childId: "00000000-0000-4000-8000-000000000001",
    catalogKey: null,
    title: "お宮参り",
    note: null,
    status: "done",
    doneOn: "2026-03-05",
    ...overrides,
  };
}

describe("sortDoneItems", () => {
  it("やった日が入っていない項目は除く", () => {
    const items = [
      makeItem({ id: "a" }),
      makeItem({ id: "b", status: "in_task", doneOn: null }),
    ];
    expect(sortDoneItems(items).map((item) => item.id)).toEqual(["a"]);
  });

  it("やった日の新しい順に並べる", () => {
    const items = [
      makeItem({ id: "a", doneOn: "2026-02-10" }),
      makeItem({ id: "b", doneOn: "2026-03-05" }),
      makeItem({ id: "c", doneOn: "2025-12-31" }),
    ];
    expect(sortDoneItems(items).map((item) => item.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("同じ日はタイトル順", () => {
    const items = [
      makeItem({ id: "a", title: "予防接種" }),
      makeItem({ id: "b", title: "お宮参り" }),
    ];
    expect(sortDoneItems(items).map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("元の配列を並べ替えない", () => {
    const items = [
      makeItem({ id: "a", doneOn: "2026-02-10" }),
      makeItem({ id: "b", doneOn: "2026-03-05" }),
    ];
    sortDoneItems(items);
    expect(items.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("groupDoneItemsByMonth", () => {
  it("記録がなければ空", () => {
    expect(groupDoneItemsByMonth([])).toEqual([]);
  });

  it("月ごとにまとめ、見出しは月を0埋めしない", () => {
    const sorted = sortDoneItems([
      makeItem({ id: "a", doneOn: "2026-03-05" }),
      makeItem({ id: "b", doneOn: "2026-03-01" }),
      makeItem({ id: "c", doneOn: "2026-02-28" }),
      makeItem({ id: "d", doneOn: "2025-12-01" }),
    ]);
    const groups = groupDoneItemsByMonth(sorted);
    expect(
      groups.map((group) => [group.heading, group.rows.map((item) => item.id)]),
    ).toEqual([
      ["2026年3月", ["a", "b"]],
      ["2026年2月", ["c"]],
      ["2025年12月", ["d"]],
    ]);
  });

  it("同じ月でも年が違えば別の見出し", () => {
    const sorted = sortDoneItems([
      makeItem({ id: "a", doneOn: "2026-03-05" }),
      makeItem({ id: "b", doneOn: "2025-03-05" }),
    ]);
    expect(groupDoneItemsByMonth(sorted).map((group) => group.heading)).toEqual(
      ["2026年3月", "2025年3月"],
    );
  });
});

describe("formatMonthDay", () => {
  it("年を落として 月/日 にする（0埋めなし）", () => {
    expect(formatMonthDay("2026-03-05")).toBe("3/5");
    expect(formatMonthDay("2026-12-25")).toBe("12/25");
  });
});

describe("splitNoteByUrl", () => {
  it("URL がなければ全体が1つのテキスト", () => {
    expect(splitNoteByUrl("写真を撮った")).toEqual([
      { text: "写真を撮った", isUrl: false },
    ]);
  });

  it("文中の URL を切り出す", () => {
    expect(splitNoteByUrl("予約は https://example.com/a から")).toEqual([
      { text: "予約は ", isUrl: false },
      { text: "https://example.com/a", isUrl: true },
      { text: " から", isUrl: false },
    ]);
  });

  it("URL は空白・改行までを1つとして扱う", () => {
    const parts = splitNoteByUrl(
      "https://example.com/a?x=1\nhttp://example.org/b メモ",
    );
    expect(parts.filter((part) => part.isUrl).map((part) => part.text)).toEqual(
      ["https://example.com/a?x=1", "http://example.org/b"],
    );
  });

  it("つなげると元のメモに戻る", () => {
    const note = "https://example.com/a と\nhttps://example.com/b";
    expect(
      splitNoteByUrl(note)
        .map((part) => part.text)
        .join(""),
    ).toBe(note);
  });
});
