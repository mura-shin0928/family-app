import { describe, expect, it } from "vitest";
import {
  imageAnalyzedMessage,
  recipeImageFileName,
  sourceAnalyzedMessage,
} from "@/features/recipes/analyze-messages";

describe("sourceAnalyzedMessage", () => {
  it("JSON-LD から読めたときは「ページから」", () => {
    expect(sourceAnalyzedMessage("jsonld", true, 5)).toEqual({
      severity: "success",
      text: "ページから5件の材料を読み取りました。内容を確認して保存してください。",
    });
  });

  it("URL の本文を AI で読んだとき", () => {
    expect(sourceAnalyzedMessage("gemini", true, 3).text).toBe(
      "ページの本文をAIで読み取り3件の材料を読み取りました。内容を確認して保存してください。",
    );
  });

  it("貼り付けテキストを AI で読んだとき", () => {
    expect(sourceAnalyzedMessage("gemini", false, 2).text).toBe(
      "AIで読み取り2件の材料を読み取りました。内容を確認して保存してください。",
    );
  });
});

describe("imageAnalyzedMessage", () => {
  it("材料が読めたら件数つきの成功", () => {
    expect(imageAnalyzedMessage(4)).toEqual({
      severity: "success",
      text: "画像から4件の材料を読み取りました。内容を確認して保存してください。",
    });
  });

  it("材料0件は警告にして手入力を促す", () => {
    expect(imageAnalyzedMessage(0)).toEqual({
      severity: "warning",
      text: "画像から材料を読み取れませんでした。材料は手入力で追加してください。",
    });
  });
});

describe("recipeImageFileName", () => {
  it("JPEG は jpg にする", () => {
    expect(recipeImageFileName("image/jpeg")).toBe("recipe.jpg");
  });

  it("それ以外は MIME タイプのサブタイプを使う", () => {
    expect(recipeImageFileName("image/png")).toBe("recipe.png");
    expect(recipeImageFileName("image/webp")).toBe("recipe.webp");
  });

  it("サブタイプが無ければ bin", () => {
    expect(recipeImageFileName("image")).toBe("recipe.bin");
  });
});
