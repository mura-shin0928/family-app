import "server-only";
import { createClient } from "@/lib/supabase/server";
import { deriveInvitationListStatus } from "./status";
import type {
  FamilyDTO,
  FamilyMemberDTO,
  InvitationDTO,
  InvitationPreview,
  InvitationPreviewStatus,
} from "./types";

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

/**
 * 未ログインの訪問者が /invite/<token> でメールアドレスを入力した際の事前確認。
 * auth.uid() を使わずクライアント入力のメールをそのまま照合するため anon でも呼べるが、
 * これ自体は本人確認にならない（実際の所有証明はこのあとのマジックリンク認証が担う）。
 */
export async function checkInviteEmail(
  tokenHash: string,
  email: string,
): Promise<InvitationPreview> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("check_invite_email", { p_token_hash: tokenHash, p_email: email })
    .single<{ family_name: string | null; status: string }>();

  if (error) {
    throw new Error(`failed to check invite email: ${error.message}`);
  }

  return {
    familyName: data?.family_name ?? null,
    status: (data?.status ?? "not_found") as InvitationPreviewStatus,
  };
}
