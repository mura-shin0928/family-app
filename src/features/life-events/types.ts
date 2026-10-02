/** 家族が選んで足せるライフイベントの種別（DBのcheck制約と同じ語彙）。 */
export type LifeEventKind =
  | "preconception"
  | "pregnancy"
  | "birth"
  | "nursery"
  | "school";

/** 時期の硬さ。「9月2日まで」と「妊娠5か月ごろ」の言い分けにだけ効く。 */
export type TimingKind = "deadline" | "around";

/** 目安時期の基準日。'event_start' は life_events.started_on を指す。 */
export type LifeEventAnchor = "birth" | "expected_birth" | "event_start";

export type LifeEvent = {
  id: string;
  kind: LifeEventKind;
  childId: string | null;
  startedOn: string | null;
};

/**
 * 項目の状態。candidate=テンプレ由来で未採用 / active=採用済みで未実施 /
 * done=やった日を記録済み / skipped=候補から見送り（DBのcheck制約と同じ語彙）。
 */
export type ProcedureStatus = "candidate" | "active" | "done" | "skipped";

/**
 * 家族の手続きリストの1項目。テンプレからは候補としてコピーされ、家族が採用した
 * ものだけがリストに載る。済は完了ではなく「やった日の記録」で、tasks とは紐づけない。
 */
export type LifeEventProcedure = {
  id: string;
  lifeEventId: string;
  /** どの子の手続きか。表示は子供ごとのタブに分かれ、並び順もこの単位で1本。 */
  childId: string;
  sortOrder: number;
  title: string;
  note: string | null;
  /** 公式ページ。制度一覧（seido-data-hub）から足した項目にだけ入る。 */
  url: string | null;
  /** 行政手続きか（出生届・児童手当など）。表示の「行政手続き」バッジにだけ効く。 */
  isGovernment: boolean;
  timingKind: TimingKind;
  anchorEvent: LifeEventAnchor | null;
  offsetDays: number | null;
  status: ProcedureStatus;
  /** やった日（YYYY-MM-DD）。status='done' のときだけ入る。 */
  doneOn: string | null;
  /** テンプレ由来の印。null は自分たちで足した項目。 */
  templateKey: string | null;
};

/** カタログ項目の目安時期。基準日は子の出生日か出産予定日。 */
export type CatalogTiming = {
  kind: TimingKind;
  anchor: "birth" | "expected_birth";
  offsetDays: number;
};

/** 全家族共通のカタログの1項目。key は `${kind}:<slug>` で、変更しない。 */
export type CatalogItem = {
  key: string;
  kind: LifeEventKind;
  title: string;
  summary: string;
  note: string | null;
  aliases: string[];
  timing: CatalogTiming | null;
  url: string | null;
};
