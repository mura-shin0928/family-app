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
import {
  createPurchaseLocation,
  deletePurchaseLocation,
  updatePurchaseLocation,
} from "../actions";
import type { PurchaseLocation } from "../types";

/**
 * 買う場所の管理。買うもの一覧（/tasks）専用の分類なので家族設定（/family）ではなく
 * 一覧の設定（/tasks/settings）に置く。ChildrenSection と同型。
 */
export function PurchaseLocationsSection({
  locations,
}: {
  locations: PurchaseLocation[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseLocation | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(location: PurchaseLocation) {
    setEditing(location);
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
          買う場所
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={openAdd}
        >
          追加
        </Button>
      </Stack>

      {locations.length === 0 ? (
        <Alert severity="info">
          登録すると、「買うものだけ」表示で場所ごとに絞り込めます。
        </Alert>
      ) : (
        <List dense disablePadding>
          {locations.map((location) => (
            <ListItem
              key={location.id}
              disableGutters
              secondaryAction={
                <IconButton
                  size="small"
                  aria-label={`${location.name}を編集`}
                  onClick={() => openEdit(location)}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText primary={location.name} />
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
        <PurchaseLocationForm
          location={editing}
          onDone={handleDone}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>
    </Box>
  );
}

function PurchaseLocationForm({
  location,
  onDone,
  onCancel,
}: {
  location: PurchaseLocation | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(location?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = location
        ? await updatePurchaseLocation({ id: location.id, name })
        : await createPurchaseLocation({ name });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  function handleDelete() {
    if (!location) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePurchaseLocation({ id: location.id });
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
        {location ? "買う場所を編集" : "買う場所を追加"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="場所の名前"
            placeholder="スーパー、ドラッグストアなど"
            value={name}
            onChange={(event) => setName(event.target.value)}
            size="small"
            fullWidth
            autoFocus
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
              「{location?.name}
              」を削除します。この場所が付いた買うものは「未設定」に戻ります。
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {location && !confirmingDelete && (
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
          disabled={isPending || name.trim() === ""}
        >
          保存
        </Button>
      </DialogActions>
    </>
  );
}
