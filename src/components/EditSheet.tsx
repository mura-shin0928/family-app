"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from "react";

type RequestCloseRef = { current: () => void };

const RequestCloseContext = createContext<RequestCloseRef | null>(null);

/**
 * 一覧の項目を追加・編集する下からのシート。中身は EditSheetForm で組み、
 * open の間だけ項目ごとに key を付けてマウントする（開くたびに入力値を作り直すため）。
 */
export function EditSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  // 背景タップ・Escape でも未保存の変更を確かめるため、閉じる判断はフォームに任せる。
  const requestCloseRef = useRef<() => void>(onClose);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={() => requestCloseRef.current()}
      slotProps={{
        paper: { sx: { borderRadius: "16px 16px 0 0", maxHeight: "85dvh" } },
      }}
    >
      <RequestCloseContext.Provider value={requestCloseRef}>
        {children}
      </RequestCloseContext.Provider>
    </Drawer>
  );
}

/**
 * シートの中身。下端に 削除／キャンセル／保存 を並べ、未保存の変更があるまま閉じる
 * ときと削除のときは、シートを開いたまま確認ダイアログを重ねる。
 */
export function EditSheetForm({
  title,
  dirty,
  busy = false,
  saveDisabled = false,
  onSave,
  onClose,
  deleteConfirm,
  children,
}: {
  title?: string;
  dirty: boolean;
  busy?: boolean;
  saveDisabled?: boolean;
  onSave: () => void;
  onClose: () => void;
  /** 渡したときだけ「削除」を出す。onConfirm の後もシートは閉じないので、閉じるのは呼び出し側。 */
  deleteConfirm?: { message: string; onConfirm: () => void };
  children: ReactNode;
}) {
  const requestCloseRef = useContext(RequestCloseContext);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function requestClose() {
    if (busy) return;
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  }
  if (requestCloseRef) requestCloseRef.current = requestClose;

  return (
    <Stack
      spacing={2}
      sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}
    >
      {title && (
        <Typography variant="subtitle1" component="h2">
          {title}
        </Typography>
      )}

      {children}

      <Box sx={{ display: "flex", alignItems: "center" }}>
        {deleteConfirm && (
          <Button
            color="error"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            削除
          </Button>
        )}
        <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
          <Button onClick={requestClose} disabled={busy}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={busy || saveDisabled}
          >
            保存
          </Button>
        </Stack>
      </Box>

      <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <DialogTitle>変更を破棄しますか？</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDiscard(false)}>編集に戻る</Button>
          <Button color="error" onClick={onClose}>
            破棄
          </Button>
        </DialogActions>
      </Dialog>

      {deleteConfirm && (
        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
          <DialogTitle>削除しますか？</DialogTitle>
          <DialogContent>
            <DialogContentText>{deleteConfirm.message}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(false)}>キャンセル</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                setConfirmDelete(false);
                deleteConfirm.onConfirm();
              }}
            >
              削除
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
