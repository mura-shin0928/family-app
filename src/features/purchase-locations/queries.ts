import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PurchaseLocation } from "./types";

export async function getPurchaseLocations(
  familyId: string,
): Promise<PurchaseLocation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_locations")
    .select("id, name")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`failed to load purchase locations: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }));
}
