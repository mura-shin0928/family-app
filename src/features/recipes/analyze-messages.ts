/** 読み取り結果としてフォームの上に出すメッセージ。 */
export type AnalyzeMessage = {
  severity: "success" | "warning";
  text: string;
};

export const IMAGE_UNSUPPORTED_MESSAGE: AnalyzeMessage = {
  severity: "warning",
  text: "この画像は読み取れませんでした。スクリーンショットを撮り直すか、タイトル・材料を手入力してください。",
};

export const IMAGE_TOO_LARGE_MESSAGE: AnalyzeMessage = {
  severity: "warning",
  text: "画像が大きすぎます。撮り直すか、手入力で保存してください。",
};

/** URL・テキストの読み取りに成功したときのメッセージ。 */
export function sourceAnalyzedMessage(
  via: "jsonld" | "gemini",
  hasSourceUrl: boolean,
  ingredientCount: number,
): AnalyzeMessage {
  const how =
    via === "jsonld"
      ? "ページから"
      : hasSourceUrl
        ? "ページの本文をAIで読み取り"
        : "AIで読み取り";

  return {
    severity: "success",
    text: `${how}${ingredientCount}件の材料を読み取りました。内容を確認して保存してください。`,
  };
}

/** 画像の読み取りが返ってきたときのメッセージ。材料0件は警告にする。 */
export function imageAnalyzedMessage(ingredientCount: number): AnalyzeMessage {
  if (ingredientCount === 0) {
    return {
      severity: "warning",
      text: "画像から材料を読み取れませんでした。材料は手入力で追加してください。",
    };
  }

  return {
    severity: "success",
    text: `画像から${ingredientCount}件の材料を読み取りました。内容を確認して保存してください。`,
  };
}

/** 解析に送る画像のファイル名。拡張子は MIME タイプから決める。 */
export function recipeImageFileName(mimeType: string): string {
  const extension =
    mimeType === "image/jpeg" ? "jpg" : (mimeType.split("/")[1] ?? "bin");
  return `recipe.${extension}`;
}
