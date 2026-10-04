import { describe, expect, it } from "vitest";
import { loginReturnPath, sanitizeNextPath } from "@/lib/next-path";

describe("sanitizeNextPath", () => {
  it.each([
    "/invite/abc_DEF-123",
    "/tasks/share?text=https%3A%2F%2Fx.com%2Fa",
    "/tasks/share?title=a&text=b&url=https%3A%2F%2Fexample.com",
  ])("通す: %s", (value) => {
    expect(sanitizeNextPath(value)).toBe(value);
  });

  it.each([
    "/tasks",
    "/tasks/share",
    "/tasks/share/x?text=a",
    "/tasks/shared?text=a",
    "//evil.example/tasks/share?text=a",
    "https://evil.example/tasks/share?text=a",
    "/tasks/share?text=a#frag",
    "/tasks/share?text=a b",
    "",
    null,
    undefined,
  ])("通さない: %s", (value) => {
    expect(sanitizeNextPath(value)).toBeNull();
  });
});

describe("loginReturnPath", () => {
  it("共有の受け取り画面はクエリごと返す", () => {
    expect(loginReturnPath("/tasks/share", "?text=abc")).toBe(
      "/tasks/share?text=abc",
    );
  });

  it("他のパスは null", () => {
    expect(loginReturnPath("/tasks", "")).toBeNull();
    expect(loginReturnPath("/recipes", "?x=1")).toBeNull();
    expect(loginReturnPath("/invite/abc", "")).toBeNull();
  });

  it("クエリが無ければ null", () => {
    expect(loginReturnPath("/tasks/share", "")).toBeNull();
  });

  it("Cookie に入れるとき膨らむ %XX が多いクエリは、短くても null", () => {
    expect(
      loginReturnPath("/tasks/share", `?text=${"%E3%81%82".repeat(300)}`),
    ).toBeNull();
  });

  it("X の投稿程度の日本語（140文字）は返す", () => {
    const search = `?text=${"%E3%81%82".repeat(140)}`;
    expect(loginReturnPath("/tasks/share", search)).toBe(
      `/tasks/share${search}`,
    );
  });

  it("Cookie に収まらない長さなら null", () => {
    expect(
      loginReturnPath("/tasks/share", `?text=${"a".repeat(4000)}`),
    ).toBeNull();
  });
});
