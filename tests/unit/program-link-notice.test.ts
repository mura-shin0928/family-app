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

describe("describeProgramLink", () => {
  it("生きている制度には何も付けない（確かめた日付も出さない）", () => {
    expect(describeProgramLink(program({}))).toEqual({
      notice: null,
      relatedUrls: [],
    });
  });

  it("一度も確認していない制度には何も付けない", () => {
    expect(
      describeProgramLink(program({ state: null, checkedAt: null })),
    ).toEqual({ notice: null, relatedUrls: [] });
  });

  it.each(["deleted", "deletion_candidate"])(
    "%s は開けなかったことだけを出す（日付は付けない）",
    (state) => {
      expect(describeProgramLink(program({ state })).notice).toBe(
        "公式ページを開けませんでした",
      );
    },
  );

  it("自動で確認できない制度にはそのことを出す", () => {
    expect(describeProgramLink(program({ autoUpdate: false })).notice).toBe(
      "自動で更新を確認できません",
    );
  });

  it("知らない状態には注記を付けない", () => {
    expect(
      describeProgramLink(program({ state: "something_new" })).notice,
    ).toBeNull();
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
    expect(describeProgramLink(p).relatedUrls).toEqual([
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
    expect(describeProgramLink(p).relatedUrls).toEqual([]);
  });
});
