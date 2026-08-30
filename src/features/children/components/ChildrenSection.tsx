"use client";

import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createChild, deleteChild, updateChild } from "../actions";
import type { Child } from "../types";

function formatChildDates(child: Child): string {
  const parts: string[] = [];
  if (child.birthDate) parts.push(`出生日: ${child.birthDate}`);
  else if (child.expectedBirthDate)
    parts.push(`出産予定日: ${child.expectedBirthDate}`);
  return parts.join(" / ");
}

/**
 * 子供の情報の登録場所。procedures(手続き)画面ではなく家族全体の設定である
 * 「家族」画面に置く（メンバー一覧と同じ画面）— 子供は家族に紐づく情報であり、
 * 手続きテンプレートはそれを読むだけの一利用者に過ぎないため。
 */
export function ChildrenSection({
  familyChildren,
}: {
  familyChildren: Child[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);

  function openAdd() {
    setEditingChild(null);
    setFormOpen(true);
  }

  function openEdit(child: Child) {
    setEditingChild(child);
    setFormOpen(true);
  }

  function handleDone() {
    setFormOpen(false);
    router.refresh();
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          子供
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={openAdd}
        >
          追加
        </Button>
      </Stack>

      {familyChildren.length === 0 ? (
        <Alert severity="info">
          登録すると、「手続き」タブで出産予定日・出生日からの目安期限が表示されます。
        </Alert>
      ) : (
        <List dense disablePadding>
          {familyChildren.map((child) => (
            <ListItem
              key={child.id}
              disableGutters
              secondaryAction={
                <IconButton
                  size="small"
                  aria-label={`${child.displayName}の情報を編集`}
                  onClick={() => openEdit(child)}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={child.displayName}
                secondary={formatChildDates(child)}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <ChildForm
          child={editingChild}
          onDone={handleDone}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>
    </Box>
  );
}

function ChildForm({
  child,
  onDone,
  onCancel,
}: {
  child: Child | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(child?.displayName ?? "");
  const [expectedBirthDate, setExpectedBirthDate] = useState(
    child?.expectedBirthDate ?? "",
  );
  const [birthDate, setBirthDate] = useState(child?.birthDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = child
        ? await updateChild({
            childId: child.id,
            displayName,
            expectedBirthDate,
            birthDate,
          })
        : await createChild({ displayName, expectedBirthDate, birthDate });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  function handleDelete() {
    if (!child) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteChild({ childId: child.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <>
      <DialogTitle>
        {child ? "子供の情報を編集" : "子供の情報を登録"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="名前（あだ名でも可）"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="出産予定日"
            type="date"
            value={expectedBirthDate}
            onChange={(event) => setExpectedBirthDate(event.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="妊活中などまだ分からなければ空のままでOK"
          />
          <TextField
            label="出生日（生まれたら入力）"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          {confirmingDelete && (
            <Alert
              severity="warning"
              action={
                <Button
                  color="error"
                  size="small"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  削除する
                </Button>
              }
            >
              {displayName}の情報を削除します。よろしいですか？
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {child && !confirmingDelete && (
          <Button
            color="error"
            onClick={() => setConfirmingDelete(true)}
            sx={{ mr: "auto" }}
          >
            削除
          </Button>
        )}
        <Button onClick={onCancel}>キャンセル</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending || displayName.trim() === ""}
        >
          保存
        </Button>
      </DialogActions>
    </>
  );
}
