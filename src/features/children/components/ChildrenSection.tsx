"use client";

import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DateField } from "@/components/DateField";
import { EditSheet, EditSheetForm } from "@/components/EditSheet";
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
 * 子供の情報の登録場所。ライフイベント画面ではなく家族全体の設定である
 * 「家族」画面に置く（メンバー一覧と同じ画面）— 子供は家族に紐づく情報であり、
 * 手続きテンプレートはそれを読むだけの一利用者に過ぎないため。
 */
export function ChildrenSection({
  familyChildren,
}: {
  familyChildren: Child[];
}) {
  const router = useRouter();
  // "new" = 追加、null = 閉じている。
  const [sheetTarget, setSheetTarget] = useState<Child | "new" | null>(null);

  function handleDone() {
    setSheetTarget(null);
    router.refresh();
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          子供
        </Typography>
        <IconButton
          size="small"
          aria-label="子供を追加"
          onClick={() => setSheetTarget("new")}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>

      {familyChildren.length === 0 ? (
        <Alert severity="info">
          登録すると、「ライフイベント」タブで出産予定日・出生日からの目安期限が表示されます。
        </Alert>
      ) : (
        <List dense disablePadding>
          {familyChildren.map((child) => (
            <ListItemButton
              key={child.id}
              onClick={() => setSheetTarget(child)}
              aria-label={`${child.displayName}の情報を編集`}
              sx={{ mx: -1, px: 1, borderRadius: 1 }}
            >
              <ListItemText
                primary={child.displayName}
                secondary={formatChildDates(child)}
              />
            </ListItemButton>
          ))}
        </List>
      )}

      <EditSheet
        open={sheetTarget !== null}
        onClose={() => setSheetTarget(null)}
      >
        {sheetTarget && (
          <ChildForm
            key={sheetTarget === "new" ? "new" : sheetTarget.id}
            child={sheetTarget === "new" ? null : sheetTarget}
            onDone={handleDone}
            onCancel={() => setSheetTarget(null)}
          />
        )}
      </EditSheet>
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

  function handleDelete(target: Child) {
    setError(null);
    startTransition(async () => {
      const result = await deleteChild({ childId: target.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  const dirty =
    displayName.trim() !== (child?.displayName ?? "") ||
    expectedBirthDate !== (child?.expectedBirthDate ?? "") ||
    birthDate !== (child?.birthDate ?? "");

  return (
    <EditSheetForm
      title={child ? "子供の情報を編集" : "子供の情報を登録"}
      dirty={dirty}
      busy={isPending}
      saveDisabled={displayName.trim() === ""}
      onSave={handleSubmit}
      onClose={onCancel}
      deleteConfirm={
        child
          ? {
              message: `${child.displayName}の情報を削除します。よろしいですか？`,
              onConfirm: () => handleDelete(child),
            }
          : undefined
      }
    >
      <TextField
        label="名前（あだ名でも可）"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        size="small"
        fullWidth
      />
      <DateField
        label="出産予定日"
        value={expectedBirthDate}
        onChange={(event) => setExpectedBirthDate(event.target.value)}
        size="small"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
        helperText="妊活中などまだ分からなければ空のままでOK"
      />
      <DateField
        label="出生日（生まれたら入力）"
        value={birthDate}
        onChange={(event) => setBirthDate(event.target.value)}
        size="small"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {error && <Alert severity="error">{error}</Alert>}
    </EditSheetForm>
  );
}
