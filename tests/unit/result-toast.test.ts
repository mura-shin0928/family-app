import { describe, expect, it } from "vitest";
import { errorToast, successToast, toResultToast } from "@/lib/result-toast";

describe("toResultToast", () => {
  it("成功した結果は success と成功時の文言になる", () => {
    expect(toResultToast({ ok: true }, "招待を取り消しました")).toEqual({
      severity: "success",
      message: "招待を取り消しました",
    });
  });

  it("失敗した結果は error と結果の文言になる", () => {
    expect(
      toResultToast(
        { ok: false, error: "権限がありません" },
        "招待を取り消しました",
      ),
    ).toEqual({ severity: "error", message: "権限がありません" });
  });
});

describe("successToast / errorToast", () => {
  it("文言に severity を付ける", () => {
    expect(successToast("完了しました")).toEqual({
      severity: "success",
      message: "完了しました",
    });
    expect(errorToast("通信に失敗しました")).toEqual({
      severity: "error",
      message: "通信に失敗しました",
    });
  });
});
