import type { DateString } from "@/lib/date";

/** 家族が選んで足せるライフイベントの種別（DBのcheck制約と同じ語彙）。 */
export type LifeEventKind =
  | "preconception"
  | "pregnancy"
  | "birth"
  | "nursery"
  | "school";

/** 時期の硬さ。「9月2日まで」と「妊娠5か月ごろ」の言い分けにだけ効く。 */
export type TimingKind = "deadline" | "around";

/** カタログ項目の目安時期。基準日は子の出生日か出産予定日。 */
export type CatalogTiming = {
  kind: TimingKind;
  anchor: "birth" | "expected_birth";
  offsetDays: number;
};

/** 全家族共通のカタログの1項目。key は `${kind}:<slug>` で、変更しない。 */
export type CatalogItem = {
  key: string;
  /** Web 検索の結果（key が `web:`）は種別を持たないので null。 */
  kind: LifeEventKind | null;
  title: string;
  summary: string;
  note: string | null;
  aliases: string[];
  timing: CatalogTiming | null;
  url: string | null;
};

/** 子ごとの記録（life_event_items の1行）。catalogKey が null なら自分たちで足した項目。 */
export type LifeEventItem = {
  id: string;
  childId: string;
  catalogKey: string | null;
  title: string;
  note: string | null;
  status: "in_task" | "done";
  doneOn: DateString | null;
};
