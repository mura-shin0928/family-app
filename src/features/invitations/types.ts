import type { InvitationListStatus } from "./status";

export type InvitationDTO = {
  id: string;
  invitedEmail: string;
  displayName: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  status: InvitationListStatus;
};

export type FamilyMemberDTO = {
  id: string;
  displayName: string;
  joinedAt: string;
};

/** invitation_preview RPC の status。受諾側（招待された本人）の視点。 */
export type InvitationPreviewStatus =
  | "ok"
  | "not_found"
  | "revoked"
  | "used"
  | "expired"
  | "email_mismatch";

export type InvitationPreview = {
  familyName: string | null;
  status: InvitationPreviewStatus;
};
