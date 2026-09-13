import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FamilyMunicipality = { code: string; name: string };

/** 家族が「家族」画面で選んだ自治体。未設定は null。 */
export async function getFamilyMunicipality(
  familyId: string,
): Promise<FamilyMunicipality | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("families")
    .select("municipality_code, municipality_name")
    .eq("id", familyId)
    .single();

  if (error) {
    throw new Error(`failed to load family municipality: ${error.message}`);
  }

  if (!data.municipality_code || !data.municipality_name) return null;
  return { code: data.municipality_code, name: data.municipality_name };
}
