import { describe, expect, it } from "vitest";
import {
  describeProcedureTiming,
  resolveLifeEventProcedureDate,
} from "@/features/life-events/timing";

const NO_ANCHOR = {
  birthDate: null,
  expectedBirthDate: null,
  startedOn: null,
};

describe("resolveLifeEventProcedureDate", () => {
  it("adds offsetDays to birthDate when anchorEvent is birth", () => {
    expect(
      resolveLifeEventProcedureDate(
        { anchorEvent: "birth", offsetDays: 13 },
        { ...NO_ANCHOR, birthDate: "2026-08-20" },
      ),
    ).toBe("2026-09-02");
  });

  it("supports a negative offset before expected_birth", () => {
    expect(
      resolveLifeEventProcedureDate(
        { anchorEvent: "expected_birth", offsetDays: -30 },
        { ...NO_ANCHOR, expectedBirthDate: "2026-09-01" },
      ),
    ).toBe("2026-08-02");
  });

  it("uses startedOn when anchorEvent is event_start (子に紐づかないイベント)", () => {
    expect(
      resolveLifeEventProcedureDate(
        { anchorEvent: "event_start", offsetDays: 60 },
        { ...NO_ANCHOR, startedOn: "2026-01-01" },
      ),
    ).toBe("2026-03-02");
  });

  it("returns null when the item has no anchor/offset (自由項目)", () => {
    expect(
      resolveLifeEventProcedureDate(
        { anchorEvent: null, offsetDays: null },
        { ...NO_ANCHOR, birthDate: "2026-08-20" },
      ),
    ).toBeNull();
  });

  it("returns null when the anchor date is not entered yet", () => {
    expect(
      resolveLifeEventProcedureDate(
        { anchorEvent: "birth", offsetDays: 13 },
        NO_ANCHOR,
      ),
    ).toBeNull();
  });
});

describe("describeProcedureTiming", () => {
  it("renders a deadline item as 〜までが目安", () => {
    expect(
      describeProcedureTiming(
        { timingKind: "deadline", anchorEvent: "birth", offsetDays: 13 },
        { ...NO_ANCHOR, birthDate: "2026-08-20" },
      ),
    ).toBe("2026年9月2日までが目安");
  });

  it("renders an around item as 〜ごろが目安", () => {
    expect(
      describeProcedureTiming(
        { timingKind: "around", anchorEvent: "birth", offsetDays: 28 },
        { ...NO_ANCHOR, birthDate: "2026-08-20" },
      ),
    ).toBe("2026年9月17日ごろが目安");
  });

  it("returns null when no estimate can be produced", () => {
    expect(
      describeProcedureTiming(
        { timingKind: "around", anchorEvent: "birth", offsetDays: 28 },
        NO_ANCHOR,
      ),
    ).toBeNull();
  });
});
