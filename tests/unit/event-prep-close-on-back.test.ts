import { describe, expect, it, vi } from "vitest";
import { closeViaHistory } from "@/features/event-prep/components/useCloseOnBack";

describe("closeViaHistory", () => {
  it("積んだ履歴があるときだけ1回戻る", () => {
    const history = { back: vi.fn() };
    const pushed = { current: true };
    closeViaHistory(pushed, history);
    closeViaHistory(pushed, history);
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(pushed.current).toBe(false);
  });

  it("履歴を積んでいなければ戻らない（ページを離れない）", () => {
    const history = { back: vi.fn() };
    closeViaHistory({ current: false }, history);
    expect(history.back).not.toHaveBeenCalled();
  });
});
