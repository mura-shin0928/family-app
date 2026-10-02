"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { DateField } from "@/components/DateField";

/**
 * 項目をタスク化する前の確認モーダル。タスク名は項目名、期限は目安日でプリセットし、
 * どちらもその場で編集してから「追加する」。
 * target が null の間は閉じている（開くたびに key で作り直してプリセットを反映する）。
 */
export function AddToTaskDialog({
  target,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  target: { title: string; presetDueOn: string } | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (title: string, dueOn: string) => void;
}) {
  const [title, setTitle] = useState(target?.title ?? "");
  const [dueOn, setDueOn] = useState(target?.presetDueOn ?? "");

  return (
    <Dialog open={target !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>タスクに追加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="タスク名"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            size="small"
            fullWidth
          />
          <DateField
            label="期限"
            value={dueOn}
            onChange={(event) => setDueOn(event.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={
              target?.presetDueOn
                ? "項目の目安日を入れています。変えられます。"
                : "この項目は目安日が出せないので空です。任意で入れられます。"
            }
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(title.trim(), dueOn)}
          disabled={busy || title.trim() === ""}
        >
          追加する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
