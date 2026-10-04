import type { FamilyMemberDTO } from "@/features/family/types";
import type { InvitationDTO } from "./types";

export type MemberRow = {
  kind: "member";
  id: string;
  displayName: string;
  email: string | null;
};
export type InvitationRow = InvitationDTO & { kind: "invitation" };

/** メンバー一覧の1行。参加済みのメンバーか、まだ受諾されていない招待。 */
export type MemberListRow = MemberRow | InvitationRow;

/** メンバーを先に、続けて招待を並べる。 */
export function buildMemberListRows(
  members: FamilyMemberDTO[],
  invitations: InvitationDTO[],
): MemberListRow[] {
  return [
    ...members.map(
      (member): MemberRow => ({
        kind: "member",
        id: member.id,
        displayName: member.displayName,
        email: member.email,
      }),
    ),
    // 受諾済みの招待は、対応する行がすでに members 側に出るため二重表示しない。
    ...invitations
      .filter((invitation) => invitation.status !== "accepted")
      .map(
        (invitation): InvitationRow => ({ ...invitation, kind: "invitation" }),
      ),
  ];
}

export type RowMenuAction =
  | { type: "revoke"; invitation: InvitationRow }
  | { type: "delete"; row: MemberListRow };

/** 行のメニューに出す操作。まだ有効な招待だけ取り消しで、それ以外は削除。 */
export function rowMenuAction(row: MemberListRow): RowMenuAction {
  if (row.kind === "invitation" && row.status === "pending") {
    return { type: "revoke", invitation: row };
  }
  return { type: "delete", row };
}

/** 招待された人に共有する URL。 */
export function buildInviteUrl(origin: string, token: string): string {
  return `${origin}/invite/${token}`;
}
