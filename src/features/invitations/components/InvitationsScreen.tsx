"use client";

import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type MouseEvent,
  useState,
  useTransition,
} from "react";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/layout";
import type { ActionResult, CreateInvitationResult } from "../actions";
import type { FamilyMemberDTO, InvitationDTO } from "../types";
import { InvitationStatusChip } from "./InvitationStatusChip";

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

type MemberRow = {
  kind: "member";
  id: string;
  displayName: string;
  email: string | null;
};
type InvitationRow = InvitationDTO & { kind: "invitation" };
type Row = MemberRow | InvitationRow;

export function InvitationsScreen({
  members,
  invitations,
  currentMemberId,
  createInvitation,
  revokeInvitation,
  deleteInvitation,
  removeMember,
}: Props) {
  const rows: Row[] = [
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

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<InvitationDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuTargetRow, setMenuTargetRow] = useState<Row | null>(null);

  function openRowMenu(event: MouseEvent<HTMLElement>, row: Row) {
    setMenuAnchorEl(event.currentTarget);
    setMenuTargetRow(row);
  }

  function closeRowMenu() {
    setMenuAnchorEl(null);
    setMenuTargetRow(null);
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await createInvitation({ email, displayName });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setInviteFormOpen(false);
      setInviteUrl(`${window.location.origin}/invite/${result.token}`);
      setEmail("");
      setDisplayName("");
      router.refresh();
    });
  }

  function handleRevoke(invitation: InvitationDTO) {
    startTransition(async () => {
      const result = await revokeInvitation({ invitationId: invitation.id });
      setRevokeTarget(null);
      setToast(result.ok ? "招待を取り消しました" : result.error);
      if (result.ok) router.refresh();
    });
  }

  function handleDelete(target: Row) {
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

  async function copyInviteUrl() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setToast("URLをコピーしました");
  }

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
              <Paper
                key={`member-${row.id}`}
                variant="outlined"
                sx={{ p: 1.5 }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {row.displayName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                    >
                      {row.email ?? "—"}
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", flexShrink: 0 }}
                  >
                    <InvitationStatusChip status="accepted" />
                    <IconButton
                      size="small"
                      aria-label={`${row.displayName}の操作メニュー`}
                      onClick={(event) => openRowMenu(event, row)}
                      sx={
                        row.id === currentMemberId
                          ? { visibility: "hidden" }
                          : undefined
                      }
                      tabIndex={row.id === currentMemberId ? -1 : undefined}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              <Paper
                key={`invitation-${row.id}`}
                variant="outlined"
                sx={{ p: 1.5 }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {row.displayName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                    >
                      {row.invitedEmail}
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", flexShrink: 0 }}
                  >
                    <InvitationStatusChip status={row.status} />
                    <IconButton
                      size="small"
                      aria-label={`${row.displayName}宛の招待の操作メニュー`}
                      onClick={(event) => openRowMenu(event, row)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
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

      <Dialog open={inviteFormOpen} onClose={() => setInviteFormOpen(false)}>
        <DialogTitle>新しいメンバーを招待</DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            id="invite-member-form"
            onSubmit={handleCreate}
            spacing={1.5}
            sx={{ pt: 0.5 }}
          >
            <TextField
              label="表示名"
              size="small"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              autoFocus
            />
            <TextField
              label="メールアドレス"
              type="email"
              size="small"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {formError && (
              <Alert severity="error" sx={{ py: 0 }}>
                {formError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteFormOpen(false)}>キャンセル</Button>
          <Button
            type="submit"
            form="invite-member-form"
            variant="contained"
            disabled={isPending}
          >
            招待リンクを作成
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteUrl !== null} onClose={() => setInviteUrl(null)}>
        <DialogTitle>招待リンクを作成しました</DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
            このリンクは今しか表示されません。招待したい人に共有してください。
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <TextField
              value={inviteUrl ?? ""}
              size="small"
              fullWidth
              slotProps={{ htmlInput: { readOnly: true } }}
            />
            <IconButton onClick={copyInviteUrl} aria-label="URLをコピー">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteUrl(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>

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
        {menuTargetRow?.kind === "member" && (
          <MenuItem
            onClick={() => {
              setDeleteTarget(menuTargetRow);
              closeRowMenu();
            }}
          >
            削除
          </MenuItem>
        )}
        {menuTargetRow?.kind === "invitation" &&
          (menuTargetRow.status === "pending" ? (
            <MenuItem
              onClick={() => {
                setRevokeTarget(menuTargetRow);
                closeRowMenu();
              }}
            >
              取り消す
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                setDeleteTarget(menuTargetRow);
                closeRowMenu();
              }}
            >
              削除
            </MenuItem>
          ))}
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
