import { describe, expect, it } from "vitest";
import { RELEASE_NOTES } from "@/content/release-notes";

describe("RELEASE_NOTES", () => {
  it("1 件以上あり、日付は YYYY-MM-DD で、変更点は空でない", () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(0);
    for (const note of RELEASE_NOTES) {
      expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(note.items.length).toBeGreaterThan(0);
      for (const item of note.items) expect(item.trim()).not.toBe("");
    }
  });

  it("新しい順に並んでいる", () => {
    const dates = RELEASE_NOTES.map((note) => note.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
