import { describe, expect, it } from "vitest";
import { createTaskSchema } from "@/features/tasks/schema";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "買う",
  dueOn: "",
  isPurchase: true,
  purchaseLocationId: "",
  recordChildId: "",
};

describe("createTaskSchema の url / note", () => {
  it("省略できる", () => {
    expect(createTaskSchema.safeParse(base).success).toBe(true);
  });

  it("http(s) の url とメモを通す", () => {
    const parsed = createTaskSchema.safeParse({
      ...base,
      url: "https://www.instagram.com/p/abc/",
      note: "メモ",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      url: "https://www.instagram.com/p/abc/",
      note: "メモ",
    });
  });

  it("空文字列を通す", () => {
    expect(
      createTaskSchema.safeParse({ ...base, url: "", note: "" }).success,
    ).toBe(true);
  });

  it("http(s) 以外の url を弾く", () => {
    expect(
      createTaskSchema.safeParse({ ...base, url: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });

  it("2000文字を超えるメモを弾く", () => {
    expect(
      createTaskSchema.safeParse({ ...base, note: "あ".repeat(2001) }).success,
    ).toBe(false);
  });
});
