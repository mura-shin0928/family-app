import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { PostHogMock, captureExceptionImmediate } = vi.hoisted(() => {
  const captureExceptionImmediate = vi.fn(() => Promise.resolve());
  const PostHogMock = vi.fn(function PostHog() {
    return { captureExceptionImmediate };
  });
  return { PostHogMock, captureExceptionImmediate };
});

vi.mock("posthog-node", () => ({ PostHog: PostHogMock }));

describe("toServerExceptionInput", () => {
  it("details と hint を落とす", async () => {
    const { toServerExceptionInput } = await import(
      "@/lib/analytics/exception"
    );
    const input = toServerExceptionInput({
      action: "createTask",
      error: {
        code: "23514",
        message: "violates check constraint",
        details: "Failing row contains (牛乳)",
        hint: "x",
      } as { code: string; message: string },
    });

    expect(input).toEqual({
      name: "ActionError",
      action: "createTask",
      code: "23514",
      message: "violates check constraint",
    });
  });
});

describe("captureServerException", () => {
  beforeEach(() => {
    vi.resetModules();
    PostHogMock.mockClear();
    captureExceptionImmediate.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("キーがなければ何も送らない", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { captureServerException } = await import(
      "@/lib/analytics/exception"
    );

    await captureServerException({ name: "Error", message: "boom" });

    expect(PostHogMock).not.toHaveBeenCalled();
  });

  it("名前・メッセージ・スタックを Error にし、決めた項目だけを付けて送る", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { captureServerException } = await import(
      "@/lib/analytics/exception"
    );

    await captureServerException({
      name: "TypeError",
      message: "boom",
      stack: "TypeError: boom\n    at x",
      route: "/tasks",
      digest: "123",
    });

    expect(captureExceptionImmediate).toHaveBeenCalledTimes(1);
    const [error, distinctId, properties] = captureExceptionImmediate.mock
      .calls[0] as unknown as [Error, string | undefined, object];
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("TypeError");
    expect(error.message).toBe("boom");
    expect(error.stack).toBe("TypeError: boom\n    at x");
    expect(distinctId).toBeUndefined();
    expect(properties).toEqual({ route: "/tasks", digest: "123" });
  });
});
