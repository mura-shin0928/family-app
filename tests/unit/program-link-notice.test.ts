import { describe, expect, it } from "vitest";
import { describeProgramLink } from "@/features/programs/link-notice";
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

describe("describeProgramLink", () => {
  it("生きている制度には注記を付けない", () => {
    expect(describeProgramLink(program({}), TODAY)).toEqual({
      notice: null,
      checkedOn: "最終確認: 9月21日",
      relatedUrls: [],
    });
  });

  it("一度も確認していない制度には何も付けない", () => {
    expect(
      describeProgramLink(program({ state: null, checkedAt: null }), TODAY),
    ).toEqual({ notice: null, checkedOn: null, relatedUrls: [] });
  });

  it.each(["deleted", "deletion_candidate"])(
    "%s は開けなかったことと最終確認日を出す",
    (state) => {
      expect(describeProgramLink(program({ state }), TODAY).notice).toEqual({
        message: "公式ページを開けませんでした",
        checkedOn: "最終確認: 9月21日",
      });
    },
  );

  it("最終確認日が無ければ、開けなかったことだけを出す", () => {
    expect(
      describeProgramLink(program({ state: "deleted", checkedAt: null }), TODAY)
        .notice,
    ).toEqual({ message: "公式ページを開けませんでした", checkedOn: null });
  });

  it("自動で確認できない制度にはそのことを出す", () => {
    expect(
      describeProgramLink(program({ autoUpdate: false }), TODAY).notice,
    ).toEqual({ message: "自動で更新を確認できません", checkedOn: null });
  });

  it("知らない状態には注記を付けない", () => {
    expect(
      describeProgramLink(program({ state: "something_new" }), TODAY).notice,
    ).toBeNull();
  });

  it("日付は JST で数える", () => {
    expect(
      describeProgramLink(program({ checkedAt: "2026-09-20T15:30:00Z" }), TODAY)
        .checkedOn,
    ).toBe("最終確認: 9月21日");
  });

  it("今年でない日付には年を付ける", () => {
    expect(
      describeProgramLink(
        program({ checkedAt: "2025-12-29T03:20:00+09:00" }),
        TODAY,
      ).checkedOn,
    ).toBe("最終確認: 2025年12月29日");
  });

  it("死んだ制度には、生きた関連リンクだけを順に返す", () => {
    const p = program({
      state: "deleted",
      relatedLinks: [
        { url: "https://x.test/1", state: "active", checkedAt: null },
        { url: "https://x.test/2", state: "deleted", checkedAt: null },
        { url: "https://x.test/3", state: null, checkedAt: null },
        { url: "https://x.test/4", state: "active", checkedAt: null },
      ],
    });
    expect(describeProgramLink(p, TODAY).relatedUrls).toEqual([
      "https://x.test/1",
      "https://x.test/4",
    ]);
  });

  it("生きている制度では関連リンクを返さない", () => {
    const p = program({
      relatedLinks: [
        { url: "https://x.test/1", state: "active", checkedAt: null },
      ],
    });
    expect(describeProgramLink(p, TODAY).relatedUrls).toEqual([]);
  });
});
