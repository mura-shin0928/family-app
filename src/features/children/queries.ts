import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Child } from "./types";

export async function getChildren(familyId: string): Promise<Child[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("children")
    .select("id, display_name, expected_birth_date, birth_date")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`failed to load children: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    expectedBirthDate: row.expected_birth_date,
    birthDate: row.birth_date,
  }));
}
