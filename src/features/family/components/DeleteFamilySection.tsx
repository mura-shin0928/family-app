"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/layout";
import { canConfirmFamilyDeletion } from "../deletion";

type Props = {
  familyName: string;
  deleteFamily: (input: { confirmName: string }) => Promise<ActionResult>;
};

const DELETED_ITEMS = [
  "タスク",
  "レシピ",
  "子ども",
  "ライフイベント",
  "買う場所",
  "メンバー全員のログイン",
];

export function DeleteFamilySection({ familyName, deleteFamily }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setConfirmName("");
    setError(null);
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFamily({ confirmName: confirmName.trim() });
      // 成功時はサーバー側で /login へリダイレクトする
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Box
      component="section"
      sx={{
        p: 2,
        pb: BOTTOM_NAV_CLEARANCE,
        width: "100%",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        家族ごと退会する
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        この家族のデータをすべて削除し、メンバー全員がログインできなくなります。
      </Typography>
      <Button variant="outlined" color="error" onClick={() => setOpen(true)}>
        家族ごと退会する
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>家族ごと退会しますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            次のものがすべて削除されます。
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 2, pl: 3 }}>
            {DELETED_ITEMS.map((item) => (
              <li key={item}>
                <Typography variant="body1">{item}</Typography>
              </li>
            ))}
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            削除したデータは元に戻せません。バックアップには最大7日残り、その後消えます。
          </Typography>
          <TextField
            label={`確認のため「${familyName}」と入力`}
            value={confirmName}
            onChange={(event) => {
              setConfirmName(event.target.value);
              setError(null);
            }}
            error={error !== null}
            helperText={error}
            fullWidth
            autoComplete="off"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={
              isPending || !canConfirmFamilyDeletion(confirmName, familyName)
            }
            onClick={handleDelete}
          >
            退会する
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
