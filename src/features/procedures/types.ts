export type DiscoverCandidateKind = "index" | "procedure" | "unknown";

export type DiscoverCandidate = {
  url: string;
  title: string;
  kind: DiscoverCandidateKind;
  updatedOn: string | null;
  // タイトルの機械フィルタで「制度でなさそう」と判定されたもの（§6.4）。
  // 除外はしない — チェックを外すだけで見た目に出せるようにするための印。
  likelyExcluded: boolean;
  areaCode: string | null;
  // 個別ページの取得・本文抽出に失敗した候補（kind: "unknown"のときのみtrue）。
  fetchFailed: boolean;
};

export const AREA_CODE_OPTIONS = [
  { value: "13210", label: "小金井市" },
  { value: "13", label: "東京都" },
  { value: "", label: "国（全国）" },
] as const;
