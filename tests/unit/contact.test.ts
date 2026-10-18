import { describe, expect, it } from "vitest";
import { contactMailto } from "@/lib/contact";

describe("contactMailto", () => {
  it("件名を符号化した mailto を返す", () => {
    expect(
      contactMailto("家族アプリへのお問い合わせ", "help@example.test"),
    ).toBe(
      `mailto:help@example.test?subject=${encodeURIComponent("家族アプリへのお問い合わせ")}`,
    );
  });

  it("アドレスが決まっていなければ null", () => {
    expect(contactMailto("家族アプリへのお問い合わせ", null)).toBeNull();
  });
});
