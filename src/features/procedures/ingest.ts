import "server-only";
import { fetchHtml } from "@/features/recipes/extraction/fetch-html";
import { inferAreaCode } from "./discover";
import { extractMainText } from "./extraction/extract-main";
import { extractProcedureFromText } from "./extraction/gemini";
import type {
  ExtractionFailureReason,
  ProcedureDraft,
} from "./extraction/types";
import { verifyQuotes } from "./extraction/verify-quotes";

// 1件ずつ取り込むフロー（§6.1）の1件あたりの予算。ページ側 maxDuration=60秒に
// discover（複数ページのfetch）と共有させるため、ingest自体は控えめに取る。
const INGEST_DEADLINE_MS = 28_000;

export type PreparedProcedureDraft = {
  draft: ProcedureDraft;
  sourceTitle: string;
  areaCode: string | null;
  droppedReasons: string[];
};

export type PrepareDraftFailureReason =
  | "fetch-failed"
  | "empty-body"
  | ExtractionFailureReason;

export type PrepareDraftResult =
  | { ok: true; prepared: PreparedProcedureDraft }
  | { ok: false; reason: PrepareDraftFailureReason };

// deadline_kind が要求するフィールドが欠けたままだとDB制約
// (procedures_deadline_shape) に落ちる。verifyQuotesはquoteの信頼性だけを
// 見ており正規化後の欠損値までは保証しないため、挿入直前にもう一段防御する。
function sanitizeDeadlineForDb(draft: ProcedureDraft): ProcedureDraft {
  const shapeOk =
    draft.deadlineKind === "fixed"
      ? draft.deadlineOn !== ""
      : draft.deadlineKind === "relative"
        ? draft.anchorEvent !== "" && draft.offsetCount !== null
        : draft.deadlineKind === "recommended"
          ? draft.anchorEvent !== "" &&
            draft.windowFromDays !== null &&
            draft.windowToDays !== null
          : true;

  if (shapeOk) return draft;

  return {
    ...draft,
    deadlineKind: "unknown",
    deadlineOn: "",
    anchorEvent: "",
    offsetCount: null,
    offsetCounting: "",
    windowFromDays: null,
    windowToDays: null,
    deadlineQuote: "",
  };
}

/**
 * fetch → 本文抽出 → Gemini構造化 → quote照合、までをまとめた1件分の取り込み処理。
 * DBへは触れない（挿入はServer Action側の責務。procedures RLSは列単位GRANTで
 * 中身の更新を許していないため、既存source_urlの扱いは呼び出し側で判断する）。
 */
export async function prepareProcedureDraft(
  url: string,
  areaCodeFallback: string,
): Promise<PrepareDraftResult> {
  const deadlineAt = Date.now() + INGEST_DEADLINE_MS;

  const fetched = await fetchHtml(url, { deadlineAt });
  if (!fetched.ok) {
    return { ok: false, reason: "fetch-failed" };
  }

  const main = extractMainText(fetched.html);
  if (main.text === "") {
    return { ok: false, reason: "empty-body" };
  }

  const result = await extractProcedureFromText(main.text, { deadlineAt });
  if (result.kind === "failed") {
    return { ok: false, reason: result.reason };
  }

  const { draft, droppedReasons } = verifyQuotes(result.draft, main.text);
  const sanitized = sanitizeDeadlineForDb(draft);
  const hostname = new URL(url).hostname;

  return {
    ok: true,
    prepared: {
      draft: {
        ...sanitized,
        title: sanitized.title || main.title || url,
      },
      sourceTitle: main.title || url,
      areaCode: inferAreaCode(
        hostname,
        areaCodeFallback === "" ? null : areaCodeFallback,
      ),
      droppedReasons,
    },
  };
}
