import { describe, expect, it } from "vitest";
import {
  addDaysToDateString,
  daysUntil,
  formatRelativeDue,
  startOfTodayJstUtc,
  todayInJst,
  tomorrowInJst,
} from "@/lib/date";

describe("todayInJst", () => {
  it("is still the same day at 23:59 JST", () => {
    // 2026-08-17T23:59:00+09:00 == 2026-08-17T14:59:00Z
    expect(todayInJst(new Date("2026-08-17T14:59:00Z"))).toBe("2026-08-17");
  });

  it("rolls over to the next day exactly at 00:00 JST", () => {
    // 2026-08-18T00:00:00+09:00 == 2026-08-17T15:00:00Z
    expect(todayInJst(new Date("2026-08-17T15:00:00Z"))).toBe("2026-08-18");
  });

  it("is unaffected by the machine's local timezone (pure instant -> JST date)", () => {
    // noon UTC is always the same JST calendar day regardless of runner TZ
    expect(todayInJst(new Date("2026-01-01T12:00:00Z"))).toBe("2026-01-01");
  });
});

describe("tomorrowInJst", () => {
  it("returns the JST day after today, across a month boundary", () => {
    // 2026-01-31T12:00:00+09:00-ish -> JST date 2026-01-31
    expect(tomorrowInJst(new Date("2026-01-31T03:00:00Z"))).toBe("2026-02-01");
  });
});

describe("startOfTodayJstUtc", () => {
  it("returns the UTC instant of JST midnight for the given now", () => {
    const result = startOfTodayJstUtc(new Date("2026-08-17T14:59:00Z"));
    expect(result.toISOString()).toBe("2026-08-16T15:00:00.000Z");
  });
});

describe("addDaysToDateString", () => {
  it("handles ordinary same-month addition", () => {
    expect(addDaysToDateString("2026-08-17", 3)).toBe("2026-08-20");
  });

  it("rolls over a month boundary", () => {
    expect(addDaysToDateString("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("rolls over a year boundary", () => {
    expect(addDaysToDateString("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap year Feb 29 correctly (2028 is a leap year)", () => {
    expect(addDaysToDateString("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToDateString("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("skips Feb 29 in a non-leap year (2027)", () => {
    expect(addDaysToDateString("2027-02-28", 1)).toBe("2027-03-01");
  });
});

describe("daysUntil", () => {
  it("is 0 when due today", () => {
    expect(daysUntil("2026-08-17", "2026-08-17")).toBe(0);
  });

  it("is positive for a future date", () => {
    expect(daysUntil("2026-08-24", "2026-08-17")).toBe(7);
  });

  it("is negative for a past date (overdue)", () => {
    expect(daysUntil("2026-08-10", "2026-08-17")).toBe(-7);
  });
});

describe("formatRelativeDue", () => {
  const today = "2026-08-17";

  it("labels today", () => {
    expect(formatRelativeDue("2026-08-17", today)).toBe("今日");
  });

  it("labels tomorrow", () => {
    expect(formatRelativeDue("2026-08-18", today)).toBe("明日");
  });

  it("labels several days ahead", () => {
    expect(formatRelativeDue("2026-08-20", today)).toBe("あと3日");
  });

  it("labels yesterday", () => {
    expect(formatRelativeDue("2026-08-16", today)).toBe("昨日");
  });

  it("labels overdue by several days", () => {
    expect(formatRelativeDue("2026-08-10", today)).toBe("7日超過");
  });
});
