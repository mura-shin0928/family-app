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
import { todayInJst } from "@/lib/date";

const TITLE_MAX_LENGTH = 100;
const NOTE_MAX_LENGTH = 2000;

const inputStyle = { fontSize: "1rem" };

export type RecordAddInput = { title: string; doneOn: string; note: string };

/** カタログにない出来事を記録に足す。開くたびに key で作り直す。 */
export function RecordAddDialog({
  open,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: RecordAddInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [doneOn, setDoneOn] = useState(todayInJst);
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>記録を追加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="項目名"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            fullWidth
            slotProps={{
              htmlInput: { maxLength: TITLE_MAX_LENGTH, style: inputStyle },
            }}
          />
          <DateField
            label="やった日"
            value={doneOn}
            onChange={(event) => setDoneOn(event.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="メモ（任意）"
            multiline
            minRows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            fullWidth
            slotProps={{
              htmlInput: { maxLength: NOTE_MAX_LENGTH, style: inputStyle },
            }}
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
          onClick={() =>
            onSubmit({ title: title.trim(), doneOn, note: note.trim() })
          }
          disabled={busy || title.trim() === "" || doneOn === ""}
        >
          記録する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
