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
    expect(PROCESSORS).toHaveLength(6);
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

  it("実際の挙動とずれやすい点を書いている", () => {
    const privacy = text(PRIVACY_SECTIONS);
    const terms = text(TERMS_SECTIONS);
    // 取り込み元のサイトから画像を直接読み込むので、外部送信の表に載せる
    expect(privacy).toContain("レシピの取り込み元のサイト");
    // 招待先のメールアドレスも取得している
    expect(privacy).toContain("招待した相手のメールアドレス");
    // Gemini は不正利用の検知のために期間を限って残す
    expect(privacy).toContain("不正利用の検知");
    // 外国にある第三者: 求めに応じて情報を提供する
    expect(privacy).toContain("求めに応じて");
    // 開示等の請求の手数料
    expect(privacy).toContain("手数料はいただきません");
    // 問い合わせは Gmail で受ける
    expect(privacy).toContain("Gmail");
    // 変更は効力が生じる日より前に知らせる（民法 548 条の 4）
    expect(terms).toContain("効力が生じる日");
    expect(privacy).toContain("効力が生じる日");
    // 家族の誰か一人が全員のデータを消せる
    expect(terms).toContain("メンバーの誰か一人");
  });
});
