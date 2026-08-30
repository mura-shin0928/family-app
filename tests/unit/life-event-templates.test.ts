import { describe, expect, it } from "vitest";
import {
  findLifeEventTemplate,
  LIFE_EVENT_TEMPLATES,
} from "@/features/life-events/default-templates";

// DB(life_events.kind の CHECK 制約 / life_event_procedures の各 CHECK)と
// テンプレの値がずれると、追加時に insert が落ちる。ここで固定しておく。
const KINDS = [
  "preconception",
  "pregnancy",
  "birth",
  "nursery",
  "school",
] as const;
const ANCHORS = ["birth", "expected_birth", "event_start"] as const;
const TIMING_KINDS = ["deadline", "around"] as const;

describe("LIFE_EVENT_TEMPLATES", () => {
  it("covers every life-event kind in timeline order", () => {
    expect(LIFE_EVENT_TEMPLATES.map((t) => t.kind)).toEqual([...KINDS]);
  });

  it("every item stays within the DB CHECK constraints", () => {
    for (const template of LIFE_EVENT_TEMPLATES) {
      for (const item of template.items) {
        expect(item.title.trim().length).toBeGreaterThan(0);
        expect(item.title.length).toBeLessThanOrEqual(100);
        if (item.note !== null) {
          expect(item.note.length).toBeLessThanOrEqual(2000);
        }
        expect(TIMING_KINDS).toContain(item.timingKind);
        if (item.anchorEvent !== null) {
          expect(ANCHORS).toContain(item.anchorEvent);
        }
        if (item.offsetDays !== null) {
          expect(item.offsetDays).toBeGreaterThanOrEqual(-32768);
          expect(item.offsetDays).toBeLessThanOrEqual(32767);
        }
        // anchor と offset は両方そろって初めて目安時期が出せる。片方だけ持つ
        // テンプレ項目は timing.ts 側で無視されるだけだが、意図しない取りこぼしを防ぐ。
        expect(item.anchorEvent === null).toBe(item.offsetDays === null);
      }
    }
  });

  it("妊活 template anchors its items on the event start date", () => {
    const preconception = findLifeEventTemplate("preconception");
    expect(preconception).not.toBeNull();
    expect(preconception?.items.length).toBeGreaterThan(0);
    for (const item of preconception?.items ?? []) {
      expect(item.anchorEvent).toBe("event_start");
    }
    // 妊活の行政項目には「不妊検査・不妊治療の助成」の確認が入っている
    // （P6-3で category 列は廃止したので isGovernment フラグだけで表す）。
    const government = (preconception?.items ?? []).filter(
      (item) => item.isGovernment,
    );
    expect(government.length).toBeGreaterThanOrEqual(1);
    expect(government.some((item) => /助成/.test(item.title))).toBe(true);
  });

  it("妊娠 template is all anchored on the expected birth date", () => {
    const pregnancy = findLifeEventTemplate("pregnancy");
    expect(pregnancy).not.toBeNull();
    expect(pregnancy?.items.length).toBeGreaterThan(0);
    for (const item of pregnancy?.items ?? []) {
      expect(item.anchorEvent).toBe("expected_birth");
      expect(item.offsetDays).toBeLessThanOrEqual(0);
    }
    // 戌の日参りの慣習は妊娠側（妊娠5か月ごろ）。
    expect(
      (pregnancy?.items ?? []).some((item) => /戌の日/.test(item.title)),
    ).toBe(true);
  });

  it("出産 template is anchored on the birth date and mixes in tradition items", () => {
    const birth = findLifeEventTemplate("birth");
    expect(birth).not.toBeNull();
    for (const item of birth?.items ?? []) {
      if (item.anchorEvent !== null) {
        expect(item.anchorEvent).toBe("birth");
      }
    }
    // お宮参り・お食い初め・初節句・初誕生（戌の日は妊娠側なのでここには無い）。
    const traditions = (birth?.items ?? []).filter(
      (item) =>
        !item.isGovernment &&
        /お宮参り|お食い初め|初節句|初誕生/.test(item.title),
    );
    expect(traditions.length).toBeGreaterThanOrEqual(3);
    for (const item of traditions) {
      expect(item.timingKind).toBe("around");
    }
  });
});
