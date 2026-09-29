import { describe, expect, it } from "vitest";
import {
  describeProcedureWhen,
  formatSlashDate,
} from "@/features/life-events/timing";

const ANCHOR = {
  birthDate: "2026-08-20",
  expectedBirthDate: null,
  startedOn: null,
};

describe("describeProcedureWhen", () => {
  it("shows date with まで for deadline", () => {
    expect(
      describeProcedureWhen(
        { timingKind: "deadline", anchorEvent: "birth", offsetDays: 13 },
        ANCHOR,
      ),
    ).toBe("2026/9/2まで");
  });

  it("shows date with ごろ for around", () => {
    expect(
      describeProcedureWhen(
        { timingKind: "around", anchorEvent: "birth", offsetDays: 30 },
        ANCHOR,
      ),
    ).toBe("2026/9/19ごろ");
  });

  it("returns null when the anchor date is missing", () => {
    expect(
      describeProcedureWhen(
        { timingKind: "around", anchorEvent: "expected_birth", offsetDays: 0 },
        ANCHOR,
      ),
    ).toBeNull();
  });
});

describe("formatSlashDate", () => {
  it("drops leading zeros", () => {
    expect(formatSlashDate("2026-03-05")).toBe("2026/3/5");
  });
});
