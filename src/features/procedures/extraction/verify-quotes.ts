import type { ProcedureDraft } from "./types";

const MIN_QUOTE_LENGTH = 10;

// NFKC正規化 → 空白（半角/全角/改行/タブ）を1つに畳む → 記号ゆれ（〜/～、－/-）を統一。
function normalizeForCompare(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[〜~]/g, "～")
    .replace(/[－ー―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isQuoteSupported(quote: string, normalizedSource: string): boolean {
  const trimmed = quote.trim();
  if (trimmed.length < MIN_QUOTE_LENGTH) return false;
  return normalizedSource.includes(normalizeForCompare(trimmed));
}

// 「もっともらしい引用 + 別の数字」という一番危険な形を落とす: 数字を主張する
// 項目は、その数字が引用の文字列内にも含まれていることを要求する。
function quoteContainsAllNumbers(numbers: number[], quote: string): boolean {
  return numbers.every((n) => quote.includes(String(n)));
}

function extractDigitTokens(text: string): string[] {
  return text.match(/[0-9]+/g) ?? [];
}

function deadlineNumbersSupported(draft: ProcedureDraft): boolean {
  const numbers: number[] = [];
  if (draft.deadlineKind === "relative" && draft.offsetCount !== null) {
    numbers.push(draft.offsetCount);
  }
  if (draft.deadlineKind === "recommended") {
    if (draft.windowFromDays !== null) numbers.push(draft.windowFromDays);
    if (draft.windowToDays !== null) numbers.push(draft.windowToDays);
  }
  return quoteContainsAllNumbers(numbers, draft.deadlineQuote);
}

function benefitNumbersSupported(benefit: {
  label: string;
  quote: string;
}): boolean {
  const digits = extractDigitTokens(benefit.label);
  return digits.every((digit) => benefit.quote.includes(digit));
}

export type VerifyQuotesResult = {
  draft: ProcedureDraft;
  // 落とした項目と理由。stderrに出すかどうかは呼び出し側（取り込みServer Action）に委ねる。
  droppedReasons: string[];
};

/**
 * 幻覚を機械的に落とす純関数。本文（sourceText）と一致しない・短すぎる・
 * 主張する数字が引用内に無い項目を obligation/deadline は 'unknown' に、
 * benefit は配列から除去する。
 */
export function verifyQuotes(
  draft: ProcedureDraft,
  sourceText: string,
): VerifyQuotesResult {
  const normalizedSource = normalizeForCompare(sourceText);
  const droppedReasons: string[] = [];
  const result: ProcedureDraft = { ...draft };

  if (draft.obligation !== "unknown") {
    if (!isQuoteSupported(draft.obligationQuote, normalizedSource)) {
      droppedReasons.push(
        `obligation「${draft.obligation}」を根拠不十分のためunknownに落としました（quote: "${draft.obligationQuote}"）`,
      );
      result.obligation = "unknown";
      result.obligationQuote = "";
    }
  }

  if (draft.deadlineKind !== "none" && draft.deadlineKind !== "unknown") {
    const quoteOk = isQuoteSupported(draft.deadlineQuote, normalizedSource);
    const numbersOk = deadlineNumbersSupported(draft);
    if (!quoteOk || !numbersOk) {
      droppedReasons.push(
        `deadline_kind「${draft.deadlineKind}」を根拠不十分のためunknownに落としました（quote: "${draft.deadlineQuote}"）`,
      );
      result.deadlineKind = "unknown";
      result.deadlineOn = "";
      result.anchorEvent = "";
      result.offsetCount = null;
      result.offsetCounting = "";
      result.windowFromDays = null;
      result.windowToDays = null;
      result.deadlineQuote = "";
    }
  }

  result.benefits = draft.benefits.filter((benefit) => {
    const quoteOk = isQuoteSupported(benefit.quote, normalizedSource);
    const numbersOk = benefitNumbersSupported(benefit);
    if (!quoteOk || !numbersOk) {
      droppedReasons.push(
        `benefit「${benefit.label}」を根拠不十分のため除外しました（quote: "${benefit.quote}"）`,
      );
      return false;
    }
    return true;
  });

  return { draft: result, droppedReasons };
}
