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
 * 家族の手続きリストの1項目。テンプレからコピーされた後は家族が自由に編集する
 * （この編集済みのリストそのものが家族の記録になる）。完了状態は持たない。
 */
export type LifeEventProcedure = {
  id: string;
  lifeEventId: string;
  /** どの子の手続きか。表示は子供ごとのタブに分かれ、並び順もこの単位で1本。 */
  childId: string;
  sortOrder: number;
  title: string;
  note: string | null;
  /** 行政手続きか（出生届・児童手当など）。表示の「行政手続き」バッジにだけ効く。 */
  isGovernment: boolean;
  timingKind: TimingKind;
  anchorEvent: LifeEventAnchor | null;
  offsetDays: number | null;
};
