"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import type { DoneItem } from "../records";

/**
 * 記録から外す前の確認。target が null の間は閉じている。
 * カタログ由来の項目は「探す」に戻り、自分で足した項目は消える。
 */
export function RecordRemoveDialog({
  target,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  target: DoneItem | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={target !== null} onClose={onClose}>
      <DialogTitle>記録から外しますか？</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {target?.title}
          <br />
          {target?.catalogKey ? "探すに戻ります" : "記録から消えます"}
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          キャンセル
        </Button>
        <Button variant="contained" disabled={busy} onClick={onConfirm}>
          外す
        </Button>
      </DialogActions>
    </Dialog>
  );
}
