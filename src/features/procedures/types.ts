export type ProcedureCategory =
  | "maternal_child_health_handbook"
  | "pregnancy_checkup_subsidy"
  | "pregnancy_birth_support_payment"
  | "birth_registration"
  | "maternity_lump_sum"
  | "newborn_home_visit"
  | "infant_medical_subsidy"
  | "child_allowance"
  | "health_insurance_dependent"
  | "nursery_enrollment"
  | "health_checkup_18m"
  | "health_checkup_3y"
  | "preschool_health_checkup"
  | "elementary_school_enrollment";

// DBのcheck制約と同じ語彙。表示名はここに集約する（procedures.category /
// procedure_template_items.category の両方がこの語彙を共有する）。
// 出産直後だけでなく就学前(6歳ごろ)までをカバーする。
export const PROCEDURE_CATEGORIES: readonly {
  value: ProcedureCategory;
  label: string;
}[] = [
  { value: "maternal_child_health_handbook", label: "母子健康手帳" },
  { value: "pregnancy_checkup_subsidy", label: "妊婦健診の助成" },
  { value: "pregnancy_birth_support_payment", label: "妊婦のための支援給付" },
  { value: "birth_registration", label: "出生届" },
  { value: "health_insurance_dependent", label: "健康保険の加入" },
  { value: "maternity_lump_sum", label: "出産育児一時金" },
  { value: "newborn_home_visit", label: "新生児訪問" },
  { value: "infant_medical_subsidy", label: "乳幼児医療費助成" },
  { value: "child_allowance", label: "児童手当" },
  { value: "nursery_enrollment", label: "保育所等の入園申込" },
  { value: "health_checkup_18m", label: "1歳6か月児健診" },
  { value: "health_checkup_3y", label: "3歳児健診" },
  { value: "preschool_health_checkup", label: "就学時健康診断" },
  { value: "elementary_school_enrollment", label: "小学校入学の手続き" },
] as const;

export function categoryLabel(category: ProcedureCategory | null): string {
  if (category === null) return "自由項目";
  return (
    PROCEDURE_CATEGORIES.find((c) => c.value === category)?.label ?? category
  );
}

export type LifeEventKind = "birth";

export type TemplateAnchorEvent = "birth" | "expected_birth";

export type TemplateItem = {
  id: string;
  templateId: string;
  sortOrder: number;
  title: string;
  note: string | null;
  category: ProcedureCategory | null;
  anchorEvent: TemplateAnchorEvent | null;
  offsetDays: number | null;
};

export type Template = {
  id: string;
  familyId: string;
  lifeEventKind: LifeEventKind;
  title: string;
};

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
