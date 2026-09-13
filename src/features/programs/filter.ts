import type { DateString } from "@/lib/date";
import type { Program } from "./types";

/**
 * 画面の絞り込みチップにするカテゴリーのコード。レジストリのカテゴリーのうち0〜6歳の
 * 家族に関係する3つ（002 妊娠・出産 / 003 子育て / 004 保育）。名前は /v1/tags から引く。
 */
export const PROGRAM_CATEGORY_CODES = ["002", "003", "004"] as const;

export type ProgramCategoryCode = (typeof PROGRAM_CATEGORY_CODES)[number];

export type ProgramCategoryFilter = "all" | ProgramCategoryCode;

/**
 * birthDate から today までの満月齢（誕生日の「日」に届いていなければ前の月まで）。
 * 生まれる前（today < birthDate）は null。
 */
export function ageInMonths(
  birthDate: DateString,
  today: DateString,
): number | null {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const months = (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
  return months < 0 ? null : months;
}

/**
 * 子の時期から、最初に選んでおくカテゴリ。生まれる前は「妊娠・出産」に絞る
 * （妊娠中の制度の多くは月齢の範囲を持たないので、月齢では絞れないため。
 * 「妊娠・出産」の中身は matchesCategory を参照）。
 */
export function defaultCategoryFor(
  ageMonths: number | null,
): ProgramCategoryFilter {
  return ageMonths === null ? "002" : "all";
}

/**
 * 表示する制度に絞り、同じ自治体・同じ名前・同じページの行を1件にまとめる。
 *
 * - 月齢（生まれていれば）: seido-data-hub API の age_months と同じ規則
 *   （min <= 月齢 < max、null はその側に制限なし）。範囲を持たない制度が大半なので
 *   あまり減らないが、「児童手当は3歳未満」のような範囲はここで効く。
 * - まとめる: レジストリには同じページに載った別の行（産後ケアの日帰り型・宿泊型など）が
 *   同じ呼び名で並ぶ。家族から見ると区別できず、追加しても同じ項目になるため1件にする。
 *   並び順は API のまま（市区町村が先、その中は UM 順）。
 */
export function selectPrograms(
  programs: Program[],
  {
    ageMonths,
    category,
  }: { ageMonths: number | null; category: ProgramCategoryFilter },
): Program[] {
  const seen = new Set<string>();
  const selected: Program[] = [];
  for (const program of programs) {
    if (ageMonths !== null) {
      if (program.ageMinMonths !== null && program.ageMinMonths > ageMonths)
        continue;
      if (program.ageMaxMonths !== null && program.ageMaxMonths <= ageMonths)
        continue;
    }
    if (category !== "all" && !matchesCategory(program, category)) {
      continue;
    }
    const key = [
      program.areaCode,
      programTitle(program),
      program.sourceUrl,
    ].join("\n");
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(program);
  }
  return selected;
}

/**
 * 「妊娠・出産」は、カテゴリー 002 に加えて対象者 086（妊産婦）の制度も含める。
 * 妊婦も対象の制度を 002 に分類していない自治体があるため（2026-09 に全7,812件で見て4件。
 * 例: 千代田区の育児支援訪問事業は 003 のみ。小金井市・東京都には無い）。
 */
function matchesCategory(
  program: Program,
  category: Exclude<ProgramCategoryFilter, "all">,
): boolean {
  if (program.categoryCodes.includes(category)) return true;
  return category === "002" && program.targetCodes.includes("086");
}

/** 家族に見せる名前。自治体での呼び名を優先し、無ければ UM の標準名。 */
export function programTitle(program: Program): string {
  return program.shortName ?? program.canonicalName;
}
