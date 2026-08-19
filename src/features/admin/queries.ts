import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AdminFamilyListItemDTO } from "./types";

/**
 * /admin のFamily一覧。is_app_admin() 経由でRLSが全Familyを見せるため、
 * 呼び出し元（/admin配下のページ）でrequireAppAdmin()を通していることが前提。
 */
export async function listFamiliesForAdmin(): Promise<
  AdminFamilyListItemDTO[]
> {
  const supabase = await createClient();

  const [familiesResult, membersResult] = await Promise.all([
    supabase
      .from("families")
      .select("id, name, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("family_members").select("family_id"),
  ]);

  if (familiesResult.error) {
    throw new Error(`failed to load families: ${familiesResult.error.message}`);
  }
  if (membersResult.error) {
    throw new Error(
      `failed to load family_members: ${membersResult.error.message}`,
    );
  }

  const memberCountByFamilyId = new Map<string, number>();
  for (const row of membersResult.data ?? []) {
    memberCountByFamilyId.set(
      row.family_id,
      (memberCountByFamilyId.get(row.family_id) ?? 0) + 1,
    );
  }

  return (familiesResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    memberCount: memberCountByFamilyId.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));
}
