import "server-only";
import { createClient } from "@/lib/supabase/server";
import { deriveInvitationListStatus } from "./status";
import type {
  FamilyMemberDTO,
  InvitationDTO,
  InvitationPreview,
  InvitationPreviewStatus,
} from "./types";

export async function getFamilyMembers(
  familyId: string,
): Promise<FamilyMemberDTO[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("family_members")
    .select("id, display_name, joined_at")
    .eq("family_id", familyId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`failed to load family members: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    joinedAt: row.joined_at,
  }));
}

/** 招待中・失効済みを含む、このFamilyが発行した招待の一覧（受諾済みも履歴として残す）。 */
export async function getInvitations(
  familyId: string,
): Promise<InvitationDTO[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invitations")
    .select(
      "id, invited_email, display_name, created_at, expires_at, accepted_at, revoked_at",
    )
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`failed to load invitations: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    invitedEmail: row.invited_email,
    displayName: row.display_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    status: deriveInvitationListStatus({
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      revokedAt: row.revoked_at,
    }),
  }));
}

/**
 * 受諾前のプレビュー（Family名 + 状態）。招待テーブル自体はRLSで
 * 非メンバーに見せないため、この security definer RPC 経由でのみ取得できる。
 * 未ログインでは呼べない（authenticatedのみ実行権限がある）。
 */
export async function previewInvitation(
  tokenHash: string,
): Promise<InvitationPreview> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("invitation_preview", { p_token_hash: tokenHash })
    .single<{ family_name: string | null; status: string }>();

  if (error) {
    throw new Error(`failed to preview invitation: ${error.message}`);
  }

  return {
    familyName: data?.family_name ?? null,
    status: (data?.status ?? "not_found") as InvitationPreviewStatus,
  };
}
