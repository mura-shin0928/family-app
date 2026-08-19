const QUANTITY_WORDS =
  /^(?:少々|少量|適量|適宜|お好みで|お好み|ひとつまみ|全量|同量)$/;
const HAS_DIGIT = /[0-90-9]/;

function looksLikeQuantity(token: string): boolean {
  return QUANTITY_WORDS.test(token) || HAS_DIGIT.test(token);
}

/**
 * JSON-LDのrecipeIngredientは「食材名 分量」のように空白区切りの1文字列で
 * 来ることが多い（実際に複数のレシピサイトで確認済み。例:
 * "薄力粉 50g" "おろしにんにく 小さじ1/2" "レタス 適宜"）。
 * 末尾のトークンが分量らしければそこで分割し、そうでなければ元の文字列を
 * そのままnameとして返す（無理に分割して誤った分量を作らない）。
 */
export function splitIngredientNameAndQuantity(raw: string): {
  name: string;
  quantity: string;
} {
  const trimmed = raw.trim();
  const tokens = trimmed.split(/[\s　]+/).filter((token) => token !== "");

  if (tokens.length < 2) {
    return { name: trimmed, quantity: "" };
  }

  const last = tokens[tokens.length - 1];
  if (!last || !looksLikeQuantity(last)) {
    return { name: trimmed, quantity: "" };
  }

  return { name: tokens.slice(0, -1).join(" "), quantity: last };
}
