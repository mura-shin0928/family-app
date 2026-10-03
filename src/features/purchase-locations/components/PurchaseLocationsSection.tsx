"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AddIconButton } from "@/components/AddIconButton";
import { EditSheet, EditSheetForm } from "@/components/EditSheet";
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
  // "new" = 追加、null = 閉じている。
  const [sheetTarget, setSheetTarget] = useState<
    PurchaseLocation | "new" | null
  >(null);

  function handleDone() {
    setSheetTarget(null);
    router.refresh();
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          買う場所
        </Typography>
        <AddIconButton
          aria-label="買う場所を追加"
          onClick={() => setSheetTarget("new")}
        />
      </Stack>

      {locations.length === 0 ? (
        <Alert severity="info">
          登録すると、「買うもの」表示で場所ごとに絞り込めます。
        </Alert>
      ) : (
        <List dense disablePadding>
          {locations.map((location) => (
            <ListItemButton
              key={location.id}
              onClick={() => setSheetTarget(location)}
              aria-label={`${location.name}を編集`}
              sx={{ mx: -1, px: 1, borderRadius: 1 }}
            >
              <ListItemText primary={location.name} />
            </ListItemButton>
          ))}
        </List>
      )}

      <EditSheet
        open={sheetTarget !== null}
        onClose={() => setSheetTarget(null)}
      >
        {sheetTarget && (
          <PurchaseLocationForm
            key={sheetTarget === "new" ? "new" : sheetTarget.id}
            location={sheetTarget === "new" ? null : sheetTarget}
            onDone={handleDone}
            onCancel={() => setSheetTarget(null)}
          />
        )}
      </EditSheet>
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

  function handleDelete(target: PurchaseLocation) {
    setError(null);
    startTransition(async () => {
      const result = await deletePurchaseLocation({ id: target.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <EditSheetForm
      title={location ? "買う場所を編集" : "買う場所を追加"}
      dirty={name.trim() !== (location?.name ?? "")}
      busy={isPending}
      saveDisabled={name.trim() === ""}
      onSave={handleSubmit}
      onClose={onCancel}
      deleteConfirm={
        location
          ? {
              message: `「${location.name}」を削除します。この場所が付いた買うものは「未設定」に戻ります。`,
              onConfirm: () => handleDelete(location),
            }
          : undefined
      }
    >
      <TextField
        label="場所の名前"
        placeholder="スーパー、ドラッグストアなど"
        value={name}
        onChange={(event) => setName(event.target.value)}
        size="small"
        fullWidth
        autoFocus={!location}
      />
      {error && <Alert severity="error">{error}</Alert>}
    </EditSheetForm>
  );
}
