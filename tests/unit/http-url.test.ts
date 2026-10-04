import { describe, expect, it } from "vitest";
import { addLifeEventItemToTaskSchema } from "@/features/life-events/item-schema";
import { createRecipeSchema } from "@/features/recipes/schema";
import { updateTaskSchema } from "@/features/tasks/schema";
import { httpUrlSchema, isHttpUrl } from "@/lib/url";

const TASK_ID = "11111111-1111-4111-8111-111111111111";

describe("isHttpUrl", () => {
  it.each([
    "https://example.com/path?q=1",
    "http://example.com",
    "HTTPS://EXAMPLE.COM",
  ])("http(s) は通す: %s", (value) => {
    expect(isHttpUrl(value)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "ftp://example.com",
    "example.com",
    "",
  ])("http(s) 以外は弾く: %s", (value) => {
    expect(isHttpUrl(value)).toBe(false);
  });
});

describe("httpUrlSchema", () => {
  it("http(s) は通す", () => {
    expect(httpUrlSchema.safeParse("https://example.com").success).toBe(true);
  });

  it("javascript: は弾く", () => {
    expect(httpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("2000文字を超えるURLは弾く", () => {
    const long = `https://example.com/${"a".repeat(2000)}`;
    expect(httpUrlSchema.safeParse(long).success).toBe(false);
  });
});

describe("各フォームのURL欄", () => {
  it("タスクのURLに javascript: を保存できない", () => {
    const result = updateTaskSchema.safeParse({
      taskId: TASK_ID,
      url: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("タスクのURLは空文字列（未設定）と https を受け付ける", () => {
    expect(
      updateTaskSchema.safeParse({ taskId: TASK_ID, url: "" }).success,
    ).toBe(true);
    expect(
      updateTaskSchema.safeParse({
        taskId: TASK_ID,
        url: "https://example.com",
      }).success,
    ).toBe(true);
  });

  it("レシピの出典URLに javascript: を保存できない", () => {
    const result = createRecipeSchema.safeParse({
      id: TASK_ID,
      title: "カレー",
      sourceUrl: "javascript:alert(1)",
      sourceText: "",
      note: "",
      ingredients: [],
    });
    expect(result.success).toBe(false);
  });

  it("制度の公式ページURLに data: を保存できない", () => {
    const result = addLifeEventItemToTaskSchema.safeParse({
      childId: TASK_ID,
      catalogKey: "program:1",
      title: "児童手当",
      dueOn: "",
      url: "data:text/html,x",
    });
    expect(result.success).toBe(false);
  });
});
