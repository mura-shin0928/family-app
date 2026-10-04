import { afterEach, describe, expect, it, vi } from "vitest";
import { logActionError } from "@/lib/log";

describe("logActionError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
