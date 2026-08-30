import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  LifeEvent,
  LifeEventAnchor,
  LifeEventKind,
  LifeEventProcedure,
  TimingKind,
} from "./types";

export async function getLifeEvents(familyId: string): Promise<LifeEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("life_events")
    .select("id, kind, title, child_id, started_on")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`failed to load life events: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as LifeEventKind,
    title: row.title,
    childId: row.child_id,
    startedOn: row.started_on,
  }));
}

/**
 * 家族の手続きリストは family 単位で1本。イベントごとに分けず sort_order だけで
 * 並べる（妊活の項目とお宮参りが時系列で混ざるのが自然なため）。
 */
export async function getLifeEventProcedures(
  familyId: string,
): Promise<LifeEventProcedure[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("life_event_procedures")
    .select(
      "id, life_event_id, sort_order, title, note, is_government, timing_kind, anchor_event, offset_days",
    )
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`failed to load life event procedures: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    lifeEventId: row.life_event_id,
    sortOrder: row.sort_order,
    title: row.title,
    note: row.note,
    isGovernment: row.is_government,
    timingKind: row.timing_kind as TimingKind,
    anchorEvent: row.anchor_event as LifeEventAnchor | null,
    offsetDays: row.offset_days,
  }));
}
