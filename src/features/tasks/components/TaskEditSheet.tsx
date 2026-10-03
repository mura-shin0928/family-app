"use client";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import LinkIcon from "@mui/icons-material/Link";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { DateField } from "@/components/DateField";
import { PurchaseLocationOptions } from "@/features/purchase-locations/components/PurchaseLocationOptions";
import type { PurchaseLocation } from "@/features/purchase-locations/types";
import { addDaysToDateString, todayInJst } from "@/lib/date";
import {
  buildTaskPatch,
  draftFromTask,
  isDraftDirty,
  type TaskDraft,
  type TaskDraftErrors,
  type TaskUpdatePatch,
  validateTaskPatch,
} from "../edit-draft";
import type { TaskDTO } from "../types";

type Props = {
  task: TaskDTO | null;
  locations: PurchaseLocation[];
  recordChildName: string | null;
  onSave: (task: TaskDTO, patch: TaskUpdatePatch) => void;
  onDelete: (task: TaskDTO) => void;
  onClose: () => void;
};

const inputStyle = { style: { fontSize: "1rem" } };

/** タスクの編集シート。task が null の間は閉じている。変更は「保存」でまとめて反映する。 */
export function TaskEditSheet({
  task,
  locations,
  recordChildName,
  onSave,
  onDelete,
  onClose,
}: Props) {
  // 背景タップ・Escape でも未保存の変更を確かめるため、閉じる判断はフォームに任せる。
  const requestCloseRef = useRef<() => void>(onClose);

  return (
    <Drawer
      anchor="bottom"
      open={task !== null}
      onClose={() => requestCloseRef.current()}
      slotProps={{
        paper: { sx: { borderRadius: "16px 16px 0 0", maxHeight: "85dvh" } },
      }}
    >
      {task && (
        <TaskEditForm
          key={task.id}
          task={task}
          locations={locations}
          recordChildName={recordChildName}
          onSave={onSave}
          onDelete={onDelete}
          onClose={onClose}
          requestCloseRef={requestCloseRef}
        />
      )}
    </Drawer>
  );
}

function TaskEditForm({
  task,
  locations,
  recordChildName,
  onSave,
  onDelete,
  onClose,
  requestCloseRef,
}: Omit<Props, "task"> & {
  task: TaskDTO;
  requestCloseRef: { current: () => void };
}) {
  // 開いた時点の値を固定する。他の人の更新は下書きに反映しない。
  const [original] = useState(() => draftFromTask(task));
  const [draft, setDraft] = useState<TaskDraft>(original);
  const [errors, setErrors] = useState<TaskDraftErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [locationAnchor, setLocationAnchor] = useState<HTMLElement | null>(
    null,
  );

  const today = todayInJst();
  const tomorrow = addDaysToDateString(today, 1);
  const isCustomDue =
    draft.dueOn !== null && draft.dueOn !== today && draft.dueOn !== tomorrow;
  const [showDatePicker, setShowDatePicker] = useState(isCustomDue);
  // 論理削除済みの場所idは未設定として扱う（TaskRow と同じ）。
  const selectedLocation =
    locations.find((location) => location.id === draft.purchaseLocationId) ??
    null;

  function update(fields: Partial<TaskDraft>) {
    setDraft((current) => ({ ...current, ...fields }));
  }

  function clearError(field: keyof TaskDraftErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function selectDue(dueOn: string | null) {
    setShowDatePicker(false);
    update({ dueOn });
  }

  function requestClose() {
    if (isDraftDirty(original, draft)) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  }
  requestCloseRef.current = requestClose;

  function save() {
    const patch = buildTaskPatch(original, draft);
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    const result = validateTaskPatch(task.id, patch);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSave(task, patch);
  }

  const customDueLabel =
    isCustomDue && draft.dueOn
      ? `${Number(draft.dueOn.slice(5, 7))}/${Number(draft.dueOn.slice(8, 10))}`
      : "日付を選ぶ";

  return (
    <Stack
      spacing={2}
      sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}
    >
      <TextField
        multiline
        fullWidth
        variant="standard"
        placeholder="タスク名"
        value={draft.title}
        onChange={(event) => {
          update({ title: event.target.value });
          clearError("title");
        }}
        error={!!errors.title}
        helperText={errors.title}
        slotProps={{ htmlInput: inputStyle }}
      />

      <Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip
            icon={<CalendarTodayOutlinedIcon />}
            label="今日"
            clickable
            color={draft.dueOn === today ? "primary" : "default"}
            variant={draft.dueOn === today ? "filled" : "outlined"}
            onClick={() => selectDue(today)}
          />
          <Chip
            icon={<CalendarTodayOutlinedIcon />}
            label="明日"
            clickable
            color={draft.dueOn === tomorrow ? "primary" : "default"}
            variant={draft.dueOn === tomorrow ? "filled" : "outlined"}
            onClick={() => selectDue(tomorrow)}
          />
          <Chip
            label={customDueLabel}
            clickable
            color={showDatePicker || isCustomDue ? "primary" : "default"}
            variant={showDatePicker || isCustomDue ? "filled" : "outlined"}
            onClick={() => setShowDatePicker(true)}
          />
          <Chip
            label="期限なし"
            clickable
            color={draft.dueOn === null ? "primary" : "default"}
            variant={draft.dueOn === null ? "filled" : "outlined"}
            onClick={() => selectDue(null)}
          />
        </Box>
        {showDatePicker && (
          <DateField
            size="small"
            variant="standard"
            value={draft.dueOn ?? ""}
            onChange={(event) => {
              if (event.target.value) update({ dueOn: event.target.value });
            }}
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: inputStyle }}
          />
        )}
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Chip
          icon={
            draft.isPurchase ? (
              <ShoppingCartIcon />
            ) : (
              <ShoppingCartOutlinedIcon />
            )
          }
          label="買うもの"
          clickable
          color={draft.isPurchase ? "primary" : "default"}
          variant={draft.isPurchase ? "filled" : "outlined"}
          onClick={() => update({ isPurchase: !draft.isPurchase })}
        />
        {draft.isPurchase && (
          <Chip
            icon={<PlaceOutlinedIcon />}
            label={selectedLocation?.name ?? "場所"}
            clickable
            variant="outlined"
            onClick={(event) => setLocationAnchor(event.currentTarget)}
          />
        )}
      </Box>
      <Menu
        anchorEl={locationAnchor}
        open={!!locationAnchor}
        onClose={() => setLocationAnchor(null)}
      >
        <PurchaseLocationOptions
          locations={locations}
          selectedId={selectedLocation?.id ?? null}
          onSelect={(id) => {
            update({ purchaseLocationId: id });
            setLocationAnchor(null);
          }}
        />
      </Menu>

      <TextField
        type="url"
        variant="standard"
        placeholder="URL"
        value={draft.url}
        onChange={(event) => {
          update({ url: event.target.value });
          clearError("url");
        }}
        error={!!errors.url}
        helperText={errors.url}
        slotProps={{
          input: {
            startAdornment: (
              <LinkIcon
                fontSize="small"
                sx={{ color: "text.secondary", mr: 0.5 }}
              />
            ),
            endAdornment: task.url ? (
              <IconButton
                component="a"
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                aria-label="URLを開く"
              >
                <OpenInNewIcon fontSize="inherit" />
              </IconButton>
            ) : undefined,
          },
          htmlInput: inputStyle,
        }}
      />

      <TextField
        multiline
        minRows={2}
        variant="standard"
        placeholder="メモ"
        value={draft.note}
        onChange={(event) => {
          update({ note: event.target.value });
          clearError("note");
        }}
        error={!!errors.note}
        helperText={errors.note}
        slotProps={{
          input: {
            startAdornment: (
              <NotesOutlinedIcon
                fontSize="small"
                sx={{
                  color: "text.secondary",
                  mr: 0.5,
                  alignSelf: "flex-start",
                  mt: "2px",
                }}
              />
            ),
          },
          htmlInput: inputStyle,
        }}
      />

      {recordChildName && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "text.secondary",
          }}
        >
          <ChildCareIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2">{recordChildName}の記録に残す</Typography>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Button color="error" onClick={() => onDelete(task)}>
          削除
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={requestClose}>キャンセル</Button>
          <Button variant="contained" onClick={save}>
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
    </Stack>
  );
}
