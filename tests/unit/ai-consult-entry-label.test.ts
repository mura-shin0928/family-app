import { describe, expect, it } from "vitest";
import { consultEntryLabel } from "@/features/ai-consult/entry-label";

describe("consultEntryLabel", () => {
  it("項目のタイトルを入れて、周辺タスクの相談だと分かる文言にする", () => {
    expect(consultEntryLabel("児童手当")).toBe(
      "児童手当の周辺タスクを AI と相談",
    );
  });
});
