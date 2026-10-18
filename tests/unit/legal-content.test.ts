import { describe, expect, it } from "vitest";
import { PROCESSORS, TERMS_VERSION } from "@/content/legal";
import { PRIVACY_SECTIONS } from "@/content/privacy";
import { TERMS_SECTIONS } from "@/content/terms";

const text = (sections: typeof PRIVACY_SECTIONS) => JSON.stringify(sections);

describe("規約とポリシーの内容", () => {
  it("版は YYYY-MM-DD", () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("プライバシーポリシーに、使っている外部サービスがすべて載っている", () => {
    for (const name of ["Supabase", "Vercel", "Gemini", "Tavily", "PostHog"]) {
      expect(text(PRIVACY_SECTIONS), name).toContain(name);
    }
    expect(PROCESSORS).toHaveLength(5);
  });

  it("退会で即時に削除し、バックアップに最大7日残ることを両方に書いている", () => {
    for (const sections of [TERMS_SECTIONS, PRIVACY_SECTIONS]) {
      expect(text(sections)).toContain("最大7日");
    }
  });

  it("見出しと項目は重複しない（React の key に使う）", () => {
    for (const sections of [TERMS_SECTIONS, PRIVACY_SECTIONS]) {
      const headings = sections.map((s) => s.heading);
      expect(new Set(headings).size).toBe(headings.length);
      for (const section of sections) {
        for (const list of [section.items, section.paragraphs]) {
          if (list) expect(new Set(list).size).toBe(list.length);
        }
        const firstCells = section.table?.rows.map((row) => row[0]) ?? [];
        expect(new Set(firstCells).size).toBe(firstCells.length);
      }
    }
  });
});
