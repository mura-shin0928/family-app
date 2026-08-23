import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AnchorEvent,
  DeadlineKind,
  OffsetCounting,
} from "./extraction/types";
import type {
  ProcedureCategory,
  Template,
  TemplateAnchorEvent,
  TemplateItem,
} from "./types";

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

export async function getBirthTemplateWithItems(
  familyId: string,
): Promise<{ template: Template; items: TemplateItem[] } | null> {
  const supabase = await createClient();

  const { data: templateRow, error: templateError } = await supabase
    .from("procedure_templates")
    .select("id, family_id, life_event_kind, title")
    .eq("family_id", familyId)
    .eq("life_event_kind", "birth")
    .is("deleted_at", null)
    .maybeSingle();

  if (templateError) {
    throw new Error(`failed to load template: ${templateError.message}`);
  }
  if (!templateRow) return null;

  const { data: itemRows, error: itemsError } = await supabase
    .from("procedure_template_items")
    .select(
      "id, template_id, sort_order, title, note, category, anchor_event, offset_days",
    )
    .eq("template_id", templateRow.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(`failed to load template items: ${itemsError.message}`);
  }

  return {
    template: {
      id: templateRow.id,
      familyId: templateRow.family_id,
      lifeEventKind: templateRow.life_event_kind as "birth",
      title: templateRow.title,
    },
    items: (itemRows ?? []).map((row) => ({
      id: row.id,
      templateId: row.template_id,
      sortOrder: row.sort_order,
      title: row.title,
      note: row.note,
      category: row.category as ProcedureCategory | null,
      anchorEvent: row.anchor_event as TemplateAnchorEvent | null,
      offsetDays: row.offset_days,
    })),
  };
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

export type FamilyProcedureLink = {
  templateItemId: string;
  childId: string | null;
  taskId: string | null;
};

export async function getFamilyProcedureLinks(
  familyId: string,
): Promise<FamilyProcedureLink[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("family_procedures")
    .select("template_item_id, child_id, task_id")
    .eq("family_id", familyId)
    .not("template_item_id", "is", null);

  if (error) {
    throw new Error(`failed to load family_procedures: ${error.message}`);
  }

  return (data ?? [])
    .filter((row) => row.template_item_id !== null)
    .map((row) => ({
      templateItemId: row.template_item_id as string,
      childId: row.child_id,
      taskId: row.task_id,
    }));
}
