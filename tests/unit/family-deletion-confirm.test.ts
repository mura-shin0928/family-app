import { describe, expect, it } from "vitest";
import { canConfirmFamilyDeletion } from "@/features/family/deletion";

describe("canConfirmFamilyDeletion", () => {
  it("家族名と完全に一致すれば確定できる", () => {
    expect(canConfirmFamilyDeletion("村上家", "村上家")).toBe(true);
  });

  it("前後の空白と改行は無視する", () => {
    expect(canConfirmFamilyDeletion("  村上家\n", "村上家")).toBe(true);
  });

  it("一部だけ、空、途中の空白は一致とみなさない", () => {
    expect(canConfirmFamilyDeletion("村上", "村上家")).toBe(false);
    expect(canConfirmFamilyDeletion("", "村上家")).toBe(false);
    expect(canConfirmFamilyDeletion("村上 家", "村上家")).toBe(false);
  });
});
