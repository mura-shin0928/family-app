import { describe, expect, it } from "vitest";
import type { ProcedureDraft } from "@/features/procedures/extraction/types";
import { verifyQuotes } from "@/features/procedures/extraction/verify-quotes";

const SOURCE_TEXT =
  "出生届 生まれた日から14日以内にお届けください。（生まれた日を1日目として数えます。） " +
  "届出先は市民課です。出産育児一時金として50万円を支給します。";

function baseDraft(overrides: Partial<ProcedureDraft> = {}): ProcedureDraft {
  return {
    title: "出生届",
    summary: "子が生まれたときに提出する届出です。",
    obligation: "required",
    obligationQuote: "生まれた日から14日以内にお届けください",
    deadlineKind: "relative",
    deadlineOn: "",
    anchorEvent: "birth",
    offsetCount: 14,
    offsetCounting: "inclusive",
    windowFromDays: null,
    windowToDays: null,
    deadlineQuote:
      "生まれた日から14日以内にお届けください。（生まれた日を1日目として数えます。）",
    deadlineNote: "",
    eligibility: "",
    benefits: [],
    whereToApply: "市民課",
    documents: "",
    ...overrides,
  };
}

describe("verifyQuotes", () => {
  it("keeps obligation/deadline when the quotes are backed by the source text", () => {
    const { draft, droppedReasons } = verifyQuotes(baseDraft(), SOURCE_TEXT);
    expect(draft.obligation).toBe("required");
    expect(draft.deadlineKind).toBe("relative");
    expect(draft.offsetCount).toBe(14);
    expect(droppedReasons).toEqual([]);
  });

  it("falls back obligation to unknown when the quote is not found in the source", () => {
    const { draft, droppedReasons } = verifyQuotes(
      baseDraft({ obligationQuote: "本文に存在しない架空の引用文です" }),
      SOURCE_TEXT,
    );
    expect(draft.obligation).toBe("unknown");
    expect(draft.obligationQuote).toBe("");
    expect(droppedReasons).toHaveLength(1);
  });

  it("falls back obligation to unknown when the quote is shorter than 10 characters", () => {
    const { draft } = verifyQuotes(
      baseDraft({ obligationQuote: "届出です" }),
      SOURCE_TEXT,
    );
    expect(draft.obligation).toBe("unknown");
  });

  it("leaves obligation alone when it is already unknown, even without a quote", () => {
    const { draft, droppedReasons } = verifyQuotes(
      baseDraft({ obligation: "unknown", obligationQuote: "" }),
      SOURCE_TEXT,
    );
    expect(draft.obligation).toBe("unknown");
    expect(droppedReasons).toEqual([]);
  });

  it("falls back the whole deadline to unknown when the deadline quote is not in the source", () => {
    const { draft } = verifyQuotes(
      baseDraft({ deadlineQuote: "本文に無い期限の引用文がここに入ります" }),
      SOURCE_TEXT,
    );
    expect(draft.deadlineKind).toBe("unknown");
    expect(draft.anchorEvent).toBe("");
    expect(draft.offsetCount).toBeNull();
    expect(draft.offsetCounting).toBe("");
    expect(draft.deadlineQuote).toBe("");
  });

  it("falls back the deadline to unknown when offset_count is not backed by a matching number in the quote", () => {
    // quoteの引用自体は本文にあるが、offset_countが21（本文は14日）にすり替わっている
    // 「もっともらしい引用+別の数字」のケース。
    const { draft, droppedReasons } = verifyQuotes(
      baseDraft({ offsetCount: 21 }),
      SOURCE_TEXT,
    );
    expect(draft.deadlineKind).toBe("unknown");
    expect(droppedReasons.some((r) => r.includes("deadline_kind"))).toBe(true);
  });

  it("does not require deadline quotes when deadline_kind is none or unknown", () => {
    const { draft, droppedReasons } = verifyQuotes(
      baseDraft({
        deadlineKind: "none",
        deadlineQuote: "",
        anchorEvent: "",
        offsetCount: null,
        offsetCounting: "",
      }),
      SOURCE_TEXT,
    );
    expect(draft.deadlineKind).toBe("none");
    expect(droppedReasons).toEqual([]);
  });

  it("keeps a benefit whose amount is backed by the same number in the quote", () => {
    const { draft, droppedReasons } = verifyQuotes(
      baseDraft({
        obligation: "benefit",
        benefits: [
          { label: "出産育児一時金50万円", quote: "50万円を支給します" },
        ],
      }),
      SOURCE_TEXT,
    );
    expect(draft.benefits).toHaveLength(1);
    expect(droppedReasons).toEqual([]);
  });

  it("drops a benefit whose labeled amount does not appear in its own quote", () => {
    const { draft, droppedReasons } = verifyQuotes(
      baseDraft({
        obligation: "benefit",
        benefits: [
          { label: "出産育児一時金100万円", quote: "50万円を支給します" },
        ],
      }),
      SOURCE_TEXT,
    );
    expect(draft.benefits).toEqual([]);
    expect(droppedReasons.some((r) => r.includes("benefit"))).toBe(true);
  });

  it("drops a benefit whose quote is not found in the source text at all", () => {
    const { draft } = verifyQuotes(
      baseDraft({
        obligation: "benefit",
        benefits: [{ label: "架空の給付", quote: "本文には存在しない引用文" }],
      }),
      SOURCE_TEXT,
    );
    expect(draft.benefits).toEqual([]);
  });

  it("normalizes surrounding whitespace and full/half-width tilde differences before comparing", () => {
    // sourceText側は全角チルダ・前後に改行/空白。quote側はAIが半角チルダで
    // 引用してきたケースを想定（表記ゆれの吸収を確認する）。
    const source = "  対象期間は4月1日〜翌年3月31日まで（申請してください）\n";
    const { draft } = verifyQuotes(
      baseDraft({
        obligation: "conditional",
        obligationQuote: "対象期間は4月1日~翌年3月31日まで",
      }),
      source,
    );
    expect(draft.obligation).toBe("conditional");
  });
});
