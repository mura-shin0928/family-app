import { programTitle, selectPrograms } from "@/features/programs/filter";
import type { Program } from "@/features/programs/types";
import type { CatalogItem, LifeEventKind } from "./types";

function kindOf(program: Program): LifeEventKind {
  if (
    program.categoryCodes.includes("002") ||
    program.targetCodes.includes("086")
  ) {
    return "pregnancy";
  }
  if (program.categoryCodes.includes("004")) return "nursery";
  return "birth";
}

/** 自治体の制度を、カタログ項目と同じ形にする。 */
export function programToCatalogItem(program: Program): CatalogItem {
  return {
    key: `program:${program.id}`,
    kind: kindOf(program),
    title: programTitle(program),
    summary: "",
    note: null,
    aliases: program.shortName ? [program.canonicalName] : [],
    timing: null,
    url: program.sourceUrl,
  };
}

/** 月齢で絞り、同じページの重複をまとめてからカタログ項目にする。 */
export function programsToCatalog(
  programs: Program[],
  ageMonths: number | null,
): CatalogItem[] {
  return selectPrograms(programs, { ageMonths, category: "all" }).map(
    programToCatalogItem,
  );
}
