import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AnchorEvent,
  DeadlineKind,
  OffsetCounting,
} from "./extraction/types";
import type { ProcedureCategory } from "./types";

export async function getFamilyMunicipalityCode(
  familyId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("families")
    .select("municipality_code")
    .eq("id", familyId)
    .single();

  if (error) {
    throw new Error(`failed to load family: ${error.message}`);
  }

  return data.municipality_code;
}

export type MatchedProcedure = {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "published";
  category: ProcedureCategory | null;
  areaCode: string | null;
  obligation: "required" | "benefit" | "conditional" | "unknown";
  deadlineKind: DeadlineKind;
  deadlineOn: string | null;
  anchorEvent: AnchorEvent | null;
  offsetCount: number | null;
  offsetCounting: OffsetCounting | null;
  windowFromDays: number | null;
  windowToDays: number | null;
  benefits: { label: string; quote: string }[];
  whereToApply: string | null;
  documents: string | null;
  sourceUrl: string;
};

/**
 * カテゴリが一致し得る候補（draft/published両方）をまとめて取ってくる。
 * area_codeでの絞り込みはmatchProceduresForItem（純関数）側で行う。
 */
export async function getProceduresByCategories(
  categories: ProcedureCategory[],
): Promise<MatchedProcedure[]> {
  if (categories.length === 0) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("procedures")
    .select(
      "id, title, summary, status, category, area_code, obligation, deadline_kind, deadline_on, anchor_event, offset_count, offset_counting, window_from_days, window_to_days, benefits, where_to_apply, documents, source_url",
    )
    .in("category", categories)
    .in("status", ["draft", "published"]);

  if (error) {
    throw new Error(`failed to load procedures: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status as "draft" | "published",
    category: row.category as ProcedureCategory | null,
    areaCode: row.area_code,
    obligation: row.obligation,
    deadlineKind: row.deadline_kind as DeadlineKind,
    deadlineOn: row.deadline_on,
    anchorEvent: row.anchor_event as AnchorEvent | null,
    offsetCount: row.offset_count,
    offsetCounting: row.offset_counting as OffsetCounting | null,
    windowFromDays: row.window_from_days,
    windowToDays: row.window_to_days,
    benefits: row.benefits ?? [],
    whereToApply: row.where_to_apply,
    documents: row.documents,
    sourceUrl: row.source_url,
  }));
}
