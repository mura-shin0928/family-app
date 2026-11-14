import { describe, expect, it } from "vitest";
import { consultCandidates } from "@/features/ai-consult/candidates";
import { LIFE_EVENT_CATALOG } from "@/features/life-events/catalog";
import { selectCurrentItems } from "@/features/life-events/search";

const born = { birthDate: "2026-11-01", expectedBirthDate: null };
const today = "2026-11-14";

describe("consultCandidates", () => {
  it("いまの時期の項目を、先頭から limit 件返す", () => {
    const current = selectCurrentItems(LIFE_EVENT_CATALOG, born, today);
    const items = consultCandidates(born, today, 2);
    expect(items).toHaveLength(Math.min(2, current.length));
    expect(items[0]?.key).toBe(current[0]?.key);
  });

  it("基準日が無ければ空", () => {
    expect(
      consultCandidates({ birthDate: null, expectedBirthDate: null }, today, 5),
    ).toEqual([]);
  });
});
