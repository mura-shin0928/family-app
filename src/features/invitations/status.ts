export type InvitationListStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

/**
 * /family 画面の招待一覧に出す状態。実カラムでは持たず、常に
 * expires_at / accepted_at / revoked_at の3つの時刻から導出する
 * （実カラムを持つと時刻と矛盾し得るため、真実は時刻だけに一本化する）。
 */
export function deriveInvitationListStatus(
  invitation: {
    expiresAt: string;
    acceptedAt: string | null;
    revokedAt: string | null;
  },
  now: Date = new Date(),
): InvitationListStatus {
  if (invitation.revokedAt) return "revoked";
  if (invitation.acceptedAt) return "accepted";
  if (new Date(invitation.expiresAt) <= now) return "expired";
  return "pending";
}
