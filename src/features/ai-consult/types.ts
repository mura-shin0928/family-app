import type { ChildDates } from "@/features/life-events/search";
import type { CatalogTiming } from "@/features/life-events/types";
import type { DateString } from "@/lib/date";

/** 提案の題材になるイベント。 */
export type ConsultSubject = {
  title: string;
  summary: string;
  note: string | null;
};

/** モデルに渡す文脈。家族や子の名前は持たない。 */
export type ConsultContext = {
  subject: ConsultSubject;
  /** describeChildStage の結果（「出生日 2026/11/1・生後0か月」など）。 */
  childStage: string | null;
  child: ChildDates;
  municipalityName: string | null;
  today: DateString;
};

/** 質問1問。options の末尾は必ず UNDECIDED_OPTION。 */
export type ConsultQuestion = { text: string; options: string[] };

export type ConsultAnswer = { question: string; answer: string };

/** 提案の1件。timing は基準日からの日数（カタログの timing と同じ形）。 */
export type ConsultItem = {
  title: string;
  reason: string;
  timing: CatalogTiming | null;
};

/**
 * 提案の一覧。searchSuggestions は Google の検索候補の HTML で、検索を使ったときの
 * 規約上、一覧と一緒に表示する。検索しなかったときは null。
 */
export type ConsultPlan = {
  items: ConsultItem[];
  searchSuggestions: string | null;
};
