import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FamilyDTO, FamilyMemberDTO } from "./types";

export async function getFamily(familyId: string): Promise<FamilyDTO> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("families")
    .select("id, name")
    .eq("id", familyId)
    .single();

  if (error || !data) {
    throw new Error(`failed to load family: ${error?.message}`);
  }

  return { id: data.id, name: data.name };
}

/**
 * family_members はメールを持たない（accept_invitation 時に
 * invitations.invited_email との一致を検証済みのため、そこから引ける）。
 * accepted_by は招待を受諾した1人にしか付かないので user_id と1対1で対応する。
 */
export async function getFamilyMembers(
  familyId: string,
): Promise<FamilyMemberDTO[]> {
  const supabase = await createClient();

  const [membersResult, acceptedInvitationsResult] = await Promise.all([
    supabase
      .from("family_members")
      .select("id, display_name, joined_at, user_id")
      .eq("family_id", familyId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("accepted_by, invited_email")
      .eq("family_id", familyId)
      .not("accepted_by", "is", null),
  ]);

  if (membersResult.error) {
    throw new Error(
      `failed to load family members: ${membersResult.error.message}`,
    );
  }
  if (acceptedInvitationsResult.error) {
    throw new Error(
      `failed to load member emails: ${acceptedInvitationsResult.error.message}`,
    );
  }

  const emailByUserId = new Map(
    (acceptedInvitationsResult.data ?? []).map((row) => [
      row.accepted_by as string,
      row.invited_email,
    ]),
  );

  return (membersResult.data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    email: emailByUserId.get(row.user_id) ?? null,
    joinedAt: row.joined_at,
  }));
}

/** 招待中・失効済みを含む、このFamilyが発行した招待の一覧（受諾済みも履歴として残す）。 */
