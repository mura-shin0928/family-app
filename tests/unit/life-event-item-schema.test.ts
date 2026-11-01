import { describe, expect, it } from "vitest";
import { addLifeEventRecordSchema } from "@/features/life-events/item-schema";

const CHILD = "22222222-2222-4222-8222-222222222222";

describe("addLifeEventRecordSchema", () => {
  const valid = {
    childId: CHILD,
    title: " はじめて寝返り ",
    doneOn: "2026-11-02",
    note: "",
  };

  it("項目名の前後の空白を落とし、メモは空でよい", () => {
    const parsed = addLifeEventRecordSchema.parse(valid);
    expect(parsed.title).toBe("はじめて寝返り");
    expect(parsed.note).toBe("");
  });

  it("項目名が空なら通さない", () => {
    expect(
      addLifeEventRecordSchema.safeParse({ ...valid, title: "  " }).success,
    ).toBe(false);
  });

  it("やった日が空なら通さない", () => {
    expect(
      addLifeEventRecordSchema.safeParse({ ...valid, doneOn: "" }).success,
    ).toBe(false);
  });
});
