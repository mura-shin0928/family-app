"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { LifeEventProcedure } from "../types";

/**
 * やった日を入れて記録する。記録のときも日付の直しのときも同じ形で、初期値と見出しだけ
 * 呼び出し側が決める。target が null の間は閉じている（開くたびに key で作り直す）。
 */
export function RecordDoneDialog({
  target,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  target: {
    procedure: LifeEventProcedure;
    initialDate: string;
    heading: string;
  } | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (doneOn: string) => void;
}) {
  const [doneOn, setDoneOn] = useState(target?.initialDate ?? "");

  return (
    <Dialog open={target !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{target?.heading}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">{target?.procedure.title}</Typography>
          <TextField
            label="やった日"
            type="date"
            value={doneOn}
            onChange={(event) => setDoneOn(event.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
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
          onClick={() => onSubmit(doneOn)}
          disabled={busy || doneOn === ""}
        >
          記録する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
