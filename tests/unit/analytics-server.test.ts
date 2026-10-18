import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { PostHogMock, captureImmediate } = vi.hoisted(() => {
  const captureImmediate = vi.fn(() => Promise.resolve());
  const PostHogMock = vi.fn(function PostHog() {
    return { captureImmediate };
  });
  return { PostHogMock, captureImmediate };
});

vi.mock("posthog-node", () => ({ PostHog: PostHogMock }));
vi.mock("next/server", () => ({
  after: (task: () => unknown) => {
    task();
  },
}));

const member = { id: "m1", familyId: "f1" };

describe("buildEventPayload", () => {
  it("payload は distinctId・event・family_id だけを持つ", async () => {
    const { buildEventPayload } = await import("@/lib/analytics/server");
    expect(buildEventPayload(member, "task_created")).toEqual({
      distinctId: "m1",
      event: "task_created",
      properties: { family_id: "f1" },
    });
  });
});

describe("captureEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    PostHogMock.mockClear();
    captureImmediate.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("キーがなければ PostHog のクライアントを作らない", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { captureEvent } = await import("@/lib/analytics/server");

    captureEvent(member, "task_created");

    expect(PostHogMock).not.toHaveBeenCalled();
    expect(captureImmediate).not.toHaveBeenCalled();
  });

  it("キーがあれば EU に payload を送る", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { captureEvent } = await import("@/lib/analytics/server");

    captureEvent(member, "recipe_created");

    expect(PostHogMock).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({ host: "https://eu.i.posthog.com" }),
    );
    expect(captureImmediate).toHaveBeenCalledWith({
      distinctId: "m1",
      event: "recipe_created",
      properties: { family_id: "f1" },
    });
  });
});
