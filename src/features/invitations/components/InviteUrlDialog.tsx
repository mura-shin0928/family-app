"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

/** 作成した招待リンクを見せてコピーさせる。url が null の間は閉じている。 */
export function InviteUrlDialog({
  url,
  onClose,
  onCopied,
}: {
  url: string | null;
  onClose: () => void;
  onCopied: () => void;
}) {
  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    onCopied();
  }

  return (
    <Dialog open={url !== null} onClose={onClose}>
      <DialogTitle>招待リンクを作成しました</DialogTitle>
      <DialogContent>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 1.5 }}>
          このリンクは今しか表示されません。招待したい人に共有してください。
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <TextField
            value={url ?? ""}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { readOnly: true } }}
          />
          <IconButton onClick={copyUrl} aria-label="URLをコピー">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
