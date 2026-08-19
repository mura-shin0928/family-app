"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createInvitation, revokeInvitation } from "../actions";
import type { FamilyMemberDTO, InvitationDTO } from "../types";
import { InvitationStatusChip } from "./InvitationStatusChip";

type Props = {
  members: FamilyMemberDTO[];
  invitations: InvitationDTO[];
};

export function InvitationsScreen({ members, invitations }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<InvitationDTO | null>(null);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await createInvitation({ email, displayName });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
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
        pb: "calc(16px + 56px + env(safe-area-inset-bottom))",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Box component="section">
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          メンバー（{members.length}）
        </Typography>
        <Stack spacing={1}>
          {members.map((member) => (
            <Paper key={member.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="body2">{member.displayName}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Box component="section">
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          新しいメンバーを招待
        </Typography>
        <Stack component="form" onSubmit={handleCreate} spacing={1.5}>
          <TextField
            label="表示名"
            size="small"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
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
          <Button type="submit" variant="contained" disabled={isPending}>
            招待リンクを作成
          </Button>
        </Stack>
      </Box>

      <Box component="section">
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          招待の状況
        </Typography>
        {invitations.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            発行した招待はまだありません
          </Typography>
        ) : (
          <Stack spacing={1}>
            {invitations.map((invitation) => (
              <Paper key={invitation.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {invitation.displayName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                    >
                      {invitation.invitedEmail}
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <InvitationStatusChip status={invitation.status} />
                    {invitation.status === "pending" && (
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => setRevokeTarget(invitation)}
                      >
                        取り消す
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      <Dialog open={inviteUrl !== null} onClose={() => setInviteUrl(null)}>
        <DialogTitle>招待リンクを作成しました</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
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
          <Typography variant="body2">
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

      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Stack>
  );
}
