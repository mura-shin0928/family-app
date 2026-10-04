import { describe, expect, it } from "vitest";
import type { FamilyMemberDTO } from "@/features/family/types";
import {
  buildInviteUrl,
  buildMemberListRows,
  type InvitationRow,
  type MemberRow,
  rowMenuAction,
} from "@/features/invitations/member-rows";
import type { InvitationDTO } from "@/features/invitations/types";

function makeMember(overrides: Partial<FamilyMemberDTO> = {}): FamilyMemberDTO {
  return {
    id: "m1",
    displayName: "しん",
    email: "shin@example.com",
    joinedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

function makeInvitation(overrides: Partial<InvitationDTO> = {}): InvitationDTO {
  return {
    id: "i1",
    invitedEmail: "guest@example.com",
    displayName: "ゲスト",
    createdAt: "2026-08-19T00:00:00Z",
    expiresAt: "2026-08-26T00:00:00Z",
    acceptedAt: null,
    revokedAt: null,
    status: "pending",
    ...overrides,
  };
}

describe("buildMemberListRows", () => {
  it("メンバーを先に、招待を後に並べる", () => {
    const rows = buildMemberListRows(
      [makeMember({ id: "m1" }), makeMember({ id: "m2" })],
      [makeInvitation({ id: "i1" })],
    );
    expect(rows.map((row) => [row.kind, row.id])).toEqual([
      ["member", "m1"],
      ["member", "m2"],
      ["invitation", "i1"],
    ]);
  });

  it("メンバーの行は表示に使う項目だけを持つ", () => {
    const [row] = buildMemberListRows([makeMember({ email: null })], []);
    expect(row).toEqual({
      kind: "member",
      id: "m1",
      displayName: "しん",
      email: null,
    });
  });

  it("受諾済みの招待は出さない", () => {
    const rows = buildMemberListRows(
      [],
      [
        makeInvitation({ id: "i1", status: "accepted" }),
        makeInvitation({ id: "i2", status: "pending" }),
        makeInvitation({ id: "i3", status: "revoked" }),
        makeInvitation({ id: "i4", status: "expired" }),
      ],
    );
    expect(rows.map((row) => row.id)).toEqual(["i2", "i3", "i4"]);
  });

  it("招待の行は招待の項目をそのまま持つ", () => {
    const invitation = makeInvitation();
    const [row] = buildMemberListRows([], [invitation]);
    expect(row).toEqual({ ...invitation, kind: "invitation" });
  });
});

describe("rowMenuAction", () => {
  const member: MemberRow = {
    kind: "member",
    id: "m1",
    displayName: "しん",
    email: null,
  };

  function invitationRow(status: InvitationDTO["status"]): InvitationRow {
    return { ...makeInvitation({ status }), kind: "invitation" };
  }

  it("メンバーは削除", () => {
    expect(rowMenuAction(member)).toEqual({ type: "delete", row: member });
  });

  it("まだ有効な招待は取り消し", () => {
    const row = invitationRow("pending");
    expect(rowMenuAction(row)).toEqual({ type: "revoke", invitation: row });
  });

  it("取り消し済み・期限切れの招待は削除", () => {
    for (const status of ["revoked", "expired"] as const) {
      const row = invitationRow(status);
      expect(rowMenuAction(row)).toEqual({ type: "delete", row });
    }
  });
});

describe("buildInviteUrl", () => {
  it("オリジンとトークンから招待ページの URL を作る", () => {
    expect(buildInviteUrl("https://example.com", "abc123")).toBe(
      "https://example.com/invite/abc123",
    );
  });
});
