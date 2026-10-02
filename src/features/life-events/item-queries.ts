import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LifeEventItem } from "./types";

/** 家族の全子ぶんの記録を取り、画面側で子ごとに分ける。 */
export async function getLifeEventItems(
  familyId: string,
): Promise<LifeEventItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("life_event_items")
    .select("id, child_id, catalog_key, title, note, status, done_on")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`failed to load life event items: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    childId: row.child_id,
    catalogKey: row.catalog_key,
    title: row.title,
    note: row.note,
    status: row.status as LifeEventItem["status"],
    doneOn: row.done_on,
  }));
}
