import { afterEach, describe, expect, it, vi } from "vitest";

const { captureServerException } = vi.hoisted(() => ({
  captureServerException: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/analytics/exception", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics/exception")>()),
  captureServerException,
}));
vi.mock("next/server", () => ({
  after: (task: () => unknown) => {
    task();
  },
}));

import { logActionError } from "@/lib/log";

describe("logActionError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    captureServerException.mockClear();
  });

  it("action 名と code / message だけを出し、details は出さない", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logActionError("createPurchaseLocation", {
      code: "23514",
      message: "violates check constraint",
      details: "Failing row contains (スーパー)",
    } as { code: string; message: string });

    expect(spy).toHaveBeenCalledWith("[action] createPurchaseLocation failed", {
      code: "23514",
      message: "violates check constraint",
    });
  });

  it("同じ項目だけをエラー監視に送る", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    logActionError("createPurchaseLocation", {
      code: "23514",
      message: "violates check constraint",
      details: "Failing row contains (スーパー)",
    } as { code: string; message: string });

    expect(captureServerException).toHaveBeenCalledWith({
      name: "ActionError",
      action: "createPurchaseLocation",
      code: "23514",
      message: "violates check constraint",
    });
  });
});
