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

const NOTE_MAX_LENGTH = 2000;

/**
 * 記録のメモを編集する。title が null の間は閉じている。
 * 下書きは呼び出し側が持ち、開くときに今のメモを入れておく。
 */
export function RecordNoteDialog({
  title,
  draft,
  onDraftChange,
  busy,
  error,
  onClose,
  onSave,
}: {
  title: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={title !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>メモ</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">{title}</Typography>
          <TextField
            label="メモ"
            multiline
            minRows={3}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            fullWidth
            slotProps={{
              htmlInput: {
                maxLength: NOTE_MAX_LENGTH,
                style: { fontSize: "1rem" },
              },
            }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          キャンセル
        </Button>
        <Button variant="contained" disabled={busy} onClick={onSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
