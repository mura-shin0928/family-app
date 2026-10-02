import { describe, expect, it } from "vitest";
import { formatSlashDate } from "@/features/life-events/timing";

describe("formatSlashDate", () => {
  it("drops leading zeros", () => {
    expect(formatSlashDate("2026-03-05")).toBe("2026/3/5");
  });
});
