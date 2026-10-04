"use client";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState, useTransition } from "react";
import type { FamilyMemberDTO } from "@/features/family/types";
import type { ActionResult } from "@/lib/action-result";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/layout";
import type { CreateInvitationResult } from "../actions";
import {
  buildInviteUrl,
  buildMemberListRows,
  type MemberListRow,
  rowMenuAction,
} from "../member-rows";
import type { InvitationDTO } from "../types";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { InviteUrlDialog } from "./InviteUrlDialog";
import { MemberRowCard } from "./MemberRowCard";

type Props = {
  members: FamilyMemberDTO[];
  invitations: InvitationDTO[];
  /** 自分自身の行を削除操作から隠すためのID。/family以外（例: admin画面）では該当者がいないためnull。 */
  currentMemberId: string | null;
  createInvitation: (input: {
    email: string;
    displayName: string;
  }) => Promise<CreateInvitationResult>;
  revokeInvitation: (input: { invitationId: string }) => Promise<ActionResult>;
  deleteInvitation: (input: { invitationId: string }) => Promise<ActionResult>;
  removeMember: (input: { memberId: string }) => Promise<ActionResult>;
};

export function InvitationsScreen({
  members,
  invitations,
  currentMemberId,
  createInvitation,
  revokeInvitation,
  deleteInvitation,
  removeMember,
}: Props) {
  const rows = buildMemberListRows(members, invitations);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<InvitationDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberListRow | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuTargetRow, setMenuTargetRow] = useState<MemberListRow | null>(
    null,
  );

  function openRowMenu(event: MouseEvent<HTMLElement>, row: MemberListRow) {
    setMenuAnchorEl(event.currentTarget);
    setMenuTargetRow(row);
  }

  function closeRowMenu() {
    setMenuAnchorEl(null);
    setMenuTargetRow(null);
  }

  function handleRevoke(invitation: InvitationDTO) {
    startTransition(async () => {
      const result = await revokeInvitation({ invitationId: invitation.id });
      setRevokeTarget(null);
      setToast(result.ok ? "招待を取り消しました" : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleDelete(target: MemberListRow) {
    startTransition(async () => {
      const result =
        target.kind === "member"
          ? await removeMember({ memberId: target.id })
          : await deleteInvitation({ invitationId: target.id });
      setDeleteTarget(null);
      setToast(result.ok ? "メンバーを削除しました" : result.error);
      if (result.ok) router.refresh();
    });
  }

  const menuAction = menuTargetRow ? rowMenuAction(menuTargetRow) : null;

  return (
    <Stack
      spacing={4}
      sx={{
        p: 2,
        pb: BOTTOM_NAV_CLEARANCE,
        width: "100%",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Box component="section">
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          メンバー（{rows.length}）
        </Typography>
        <Stack spacing={1}>
          {rows.map((row) =>
            row.kind === "member" ? (
              <MemberRowCard
                key={`member-${row.id}`}
                displayName={row.displayName}
                email={row.email ?? "—"}
                status="accepted"
                menuLabel={`${row.displayName}の操作メニュー`}
                menuHidden={row.id === currentMemberId}
                onMenuOpen={(event) => openRowMenu(event, row)}
              />
            ) : (
              <MemberRowCard
                key={`invitation-${row.id}`}
                displayName={row.displayName}
                email={row.invitedEmail}
                status={row.status}
                menuLabel={`${row.displayName}宛の招待の操作メニュー`}
                onMenuOpen={(event) => openRowMenu(event, row)}
              />
            ),
          )}

          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ borderStyle: "dashed" }}
            onClick={() => setInviteFormOpen(true)}
          >
            メンバーを招待
          </Button>
        </Stack>
      </Box>

      <InviteMemberDialog
        open={inviteFormOpen}
        onClose={() => setInviteFormOpen(false)}
        createInvitation={createInvitation}
        onCreated={(token) => {
          setInviteFormOpen(false);
          setInviteUrl(buildInviteUrl(window.location.origin, token));
          router.refresh();
        }}
      />

      <InviteUrlDialog
        url={inviteUrl}
        onClose={() => setInviteUrl(null)}
        onCopied={() => setToast("URLをコピーしました")}
      />

      <Dialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
      >
        <DialogTitle>招待を取り消しますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {revokeTarget?.invitedEmail}{" "}
            宛の招待を取り消します。この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeTarget(null)}>キャンセル</Button>
          <Button
            color="error"
            disabled={isPending}
            onClick={() => revokeTarget && handleRevoke(revokeTarget)}
          >
            取り消す
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>{deleteTarget?.displayName}を削除しますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {deleteTarget?.displayName} を削除します。この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button
            color="error"
            disabled={isPending}
            onClick={() => deleteTarget && handleDelete(deleteTarget)}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={menuAnchorEl}
        open={menuAnchorEl !== null}
        onClose={closeRowMenu}
      >
        {menuAction?.type === "revoke" && (
          <MenuItem
            onClick={() => {
              setRevokeTarget(menuAction.invitation);
              closeRowMenu();
            }}
          >
            取り消す
          </MenuItem>
        )}
        {menuAction?.type === "delete" && (
          <MenuItem
            onClick={() => {
              setDeleteTarget(menuAction.row);
              closeRowMenu();
            }}
          >
            削除
          </MenuItem>
        )}
      </Menu>

      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Stack>
  );
}
