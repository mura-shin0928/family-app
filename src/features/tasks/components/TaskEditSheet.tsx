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
import Chip from "@mui/material/Chip";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import TextField from "@mui/material/TextField";
import { type MouseEvent, useRef, useState } from "react";
import { EditSheet, EditSheetForm } from "@/components/EditSheet";
import type { Child } from "@/features/children/types";
import { PurchaseLocationOptions } from "@/features/purchase-locations/components/PurchaseLocationOptions";
import type { PurchaseLocation } from "@/features/purchase-locations/types";
import { todayInJst } from "@/lib/date";
import { isHttpUrl } from "@/lib/url";
import {
  buildTaskPatch,
  draftFromTask,
  dueChipLabel,
  isDraftDirty,
  type TaskDraft,
  type TaskDraftErrors,
  type TaskUpdatePatch,
  validateTaskPatch,
} from "../edit-draft";
import type { TaskDTO } from "../types";
import { DuePanel } from "./DuePanel";

type Props = {
  task: TaskDTO | null;
  locations: PurchaseLocation[];
  familyChildren: Child[];
  onSave: (task: TaskDTO, patch: TaskUpdatePatch) => void;
  onDelete: (task: TaskDTO) => void;
  onClose: () => void;
};

const inputStyle = { style: { fontSize: "1rem" } };

/** タスクの編集シート。task が null の間は閉じている。変更は「保存」でまとめて反映する。 */
export function TaskEditSheet({
  task,
  locations,
  familyChildren,
  onSave,
  onDelete,
  onClose,
}: Props) {
  return (
    <EditSheet open={task !== null} onClose={onClose}>
      {task && (
        <TaskEditForm
          key={task.id}
          task={task}
          locations={locations}
          familyChildren={familyChildren}
          onSave={onSave}
          onDelete={onDelete}
          onClose={onClose}
        />
      )}
    </EditSheet>
  );
}

function TaskEditForm({
  task,
  locations,
  familyChildren,
  onSave,
  onDelete,
  onClose,
}: Omit<Props, "task"> & { task: TaskDTO }) {
  // 開いた時点の値を固定する。他の人の更新は下書きに反映しない。
  const [original] = useState(() => draftFromTask(task));
  const [draft, setDraft] = useState<TaskDraft>(original);
  const [errors, setErrors] = useState<TaskDraftErrors>({});
  const [locationAnchor, setLocationAnchor] = useState<HTMLElement | null>(
    null,
  );

  const today = todayInJst();
  const [dueOpen, setDueOpen] = useState(false);
  const dueChipRef = useRef<HTMLDivElement>(null);
  // 論理削除済みの場所idは未設定として扱う（TaskRow と同じ）。
  const selectedLocation =
    locations.find((location) => location.id === draft.purchaseLocationId) ??
    null;
  const [recordAnchor, setRecordAnchor] = useState<HTMLElement | null>(null);
  const recordChild =
    familyChildren.find((child) => child.id === draft.recordChildId) ?? null;

  function update(fields: Partial<TaskDraft>) {
    setDraft((current) => ({ ...current, ...fields }));
  }

  function clearError(field: keyof TaskDraftErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // オンのときに押したら外す。オフのときは子が1人ならその子、複数なら選ばせる。
  function toggleRecord(event: MouseEvent<HTMLElement>) {
    if (draft.recordChildId !== null) {
      update({ recordChildId: null });
      return;
    }
    if (familyChildren.length === 1) {
      update({ recordChildId: familyChildren[0]?.id ?? null });
      return;
    }
    setRecordAnchor(event.currentTarget);
  }

  function selectDue(dueOn: string | null) {
    setDueOpen(false);
    update({ dueOn });
  }

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

  return (
    <EditSheetForm
      dirty={isDraftDirty(original, draft)}
      onSave={save}
      onClose={onClose}
      deleteConfirm={{
        message: `「${task.title}」を削除しますか？`,
        onConfirm: () => onDelete(task),
      }}
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

      <ClickAwayListener onClickAway={() => setDueOpen(false)}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip
            ref={dueChipRef}
            icon={<CalendarTodayOutlinedIcon />}
            label={dueChipLabel(draft.dueOn, today)}
            clickable
            color={draft.dueOn || dueOpen ? "primary" : "default"}
            variant={draft.dueOn || dueOpen ? "filled" : "outlined"}
            onClick={() => setDueOpen((current) => !current)}
          />
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
          {(familyChildren.length > 0 || recordChild) && (
            <Chip
              icon={<ChildCareIcon />}
              label={recordChild ? recordChild.displayName : "イベント"}
              aria-label={
                recordChild
                  ? `${recordChild.displayName}のライフイベントに記録する（押すと外す）`
                  : "ライフイベントに記録する"
              }
              clickable
              color={recordChild ? "primary" : "default"}
              variant={recordChild ? "filled" : "outlined"}
              onClick={toggleRecord}
            />
          )}
          {/*
          シートの上端より上まで重ねて出す。シートは overflow でスクロールするため、
          absolute だと切れる。fixed 配置ならシートの外まで出せ、Portal を使わないので
          Drawer のフォーカス制御からも外れない。
        */}
          <Popper
            open={dueOpen}
            anchorEl={dueChipRef.current}
            placement="top-start"
            disablePortal
            popperOptions={{ strategy: "fixed" }}
            // 反転の判定がシートの枠で行われ、上に入らないとみなされて下に回るため止める。
            modifiers={[
              { name: "offset", options: { offset: [0, 8] } },
              { name: "flip", enabled: false },
            ]}
            sx={{ zIndex: 1, width: "16rem", maxWidth: "calc(100vw - 32px)" }}
          >
            <Paper elevation={1}>
              <DuePanel
                dueOn={draft.dueOn}
                today={today}
                onChange={(dueOn) => update({ dueOn })}
                onSelect={selectDue}
              />
            </Paper>
          </Popper>
        </Box>
      </ClickAwayListener>
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
      <Menu
        anchorEl={recordAnchor}
        open={!!recordAnchor}
        onClose={() => setRecordAnchor(null)}
      >
        {familyChildren.map((child) => (
          <MenuItem
            key={child.id}
            onClick={() => {
              update({ recordChildId: child.id });
              setRecordAnchor(null);
            }}
          >
            {child.displayName}
          </MenuItem>
        ))}
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
            endAdornment:
              task.url && isHttpUrl(task.url) ? (
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
    </EditSheetForm>
  );
}
