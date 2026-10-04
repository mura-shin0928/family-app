"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { type FormEvent, useState, useTransition } from "react";
import type { CreateInvitationResult } from "../actions";

/**
 * 表示名とメールアドレスを入れて招待を作る。作成できたらトークンを onCreated で返す。
 * 入力はキャンセルしても残し、作成できたときだけ空に戻す。
 */
export function InviteMemberDialog({
  open,
  onClose,
  createInvitation,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  createInvitation: (input: {
    email: string;
    displayName: string;
  }) => Promise<CreateInvitationResult>;
  onCreated: (token: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await createInvitation({ email, displayName });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      onCreated(result.token);
      setEmail("");
      setDisplayName("");
    });
  }

  return (
    <Dialog open={open} onClose={onClose}>
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
        <Button onClick={onClose}>キャンセル</Button>
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
  );
}
