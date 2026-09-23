"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddTaskIcon from "@mui/icons-material/AddTask";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import NotesIcon from "@mui/icons-material/Notes";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { addDaysToDateString, daysUntil } from "@/lib/date";
import {
  ANCHOR_OPTIONS,
  describeProcedureTiming,
  type LifeEventAnchorDates,
  TIMING_KIND_OPTIONS,
} from "../timing";
import type { LifeEventProcedure } from "../types";

export type TimingChange = {
  isGovernment: boolean;
  timingKind: string;
  anchorEvent: string;
  offsetDays: number | string;
};

type Props = {
  procedure: LifeEventProcedure;
  /** この項目が属するライフイベントの基準日（目安時期の計算に使う）。 */
  anchor: LifeEventAnchorDates;
  /** 並べ替えの保存待ち・絞り込み中はハンドルを止める。 */
  busy: boolean;
  /** 絞り込み中は並べ替え不可（sort_order は子単位で1本のため座標がずれる）。 */
  reorderDisabled?: boolean;
  onTitleChange: (id: string, title: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onTimingChange: (id: string, change: TimingChange) => void;
  onAddToTask: (procedure: LifeEventProcedure) => void;
  onDelete: (procedure: LifeEventProcedure) => void;
};

export function LifeEventProcedureRow({
  procedure,
  anchor,
  busy,
  reorderDisabled = false,
  onTitleChange,
  onNoteChange,
  onTimingChange,
  onAddToTask,
  onDelete,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasNote = !!procedure.note;

  const timingLabel = describeProcedureTiming(procedure, anchor);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: procedure.id, disabled: busy || reorderDisabled });

  const dragDisabled = busy || reorderDisabled;

  function commitTitle(value: string) {
    const trimmed = value.trim();
    setEditingTitle(false);
    if (trimmed && trimmed !== procedure.title) {
      onTitleChange(procedure.id, trimmed);
    }
  }

  function commitNote(value: string) {
    const trimmed = value.trim();
    if (trimmed !== (procedure.note ?? "")) {
      onNoteChange(procedure.id, trimmed);
    }
  }

  return (
    <Box
      ref={setNodeRef}
      sx={{
        px: 1,
        py: 0.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        // ドラッグ中の行は浮かせて、下に潜り込む行と重なっても見えるようにする。
        ...(isDragging && { position: "relative", zIndex: 1, boxShadow: 3 }),
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <IconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={dragDisabled}
          aria-label="ドラッグして並べ替え"
          size="small"
          disableRipple
          sx={{
            cursor: dragDisabled ? "default" : "grab",
            // ハンドル上のタッチはスクロールに取られず必ずドラッグ開始にする。
            touchAction: "none",
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          {editingTitle ? (
            <TextField
              multiline
              fullWidth
              size="small"
              variant="standard"
              autoFocus
              defaultValue={procedure.title}
              onFocus={(event) => event.target.select()}
              onBlur={(event) => commitTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  setEditingTitle(false);
                }
              }}
              slotProps={{ htmlInput: { style: { fontSize: "1rem" } } }}
            />
          ) : (
            <Typography
              variant="body2"
              onClick={() => setEditingTitle(true)}
              sx={{ cursor: "text", overflowWrap: "break-word" }}
            >
              {procedure.title}
            </Typography>
          )}
        </Box>

        <IconButton
          onClick={() => setDetailsOpen((current) => !current)}
          color={detailsOpen ? "primary" : "default"}
          aria-pressed={detailsOpen}
          aria-label="行政手続きか・時期を編集"
          size="small"
        >
          <TuneIcon fontSize="small" />
        </IconButton>

        <IconButton
          onClick={() => setNoteOpen((current) => !current)}
          color={hasNote ? "primary" : "default"}
          aria-pressed={noteOpen}
          aria-label={hasNote ? "メモを編集" : "メモを追加"}
          size="small"
        >
          {hasNote ? (
            <NotesIcon fontSize="small" />
          ) : (
            <NotesOutlinedIcon fontSize="small" />
          )}
        </IconButton>

        <IconButton
          onClick={() => onAddToTask(procedure)}
          disabled={busy}
          aria-label="タスクに追加"
          size="small"
        >
          <AddTaskIcon fontSize="small" />
        </IconButton>

        <IconButton
          onClick={() => onDelete(procedure)}
          aria-label="削除"
          size="small"
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* 行政手続きバッジ + 時期 + 公式ページ。どれも無ければ行ごと出さない。 */}
      {(procedure.isGovernment || timingLabel || procedure.url) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 0.5,
            pl: "36px",
            pr: 1,
            cursor: "pointer",
          }}
          onClick={() => setDetailsOpen((current) => !current)}
        >
          {procedure.isGovernment && (
            <Chip
              label="行政手続き"
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
          {timingLabel && (
            <Typography variant="caption" color="text.secondary">
              {timingLabel}
            </Typography>
          )}
          {procedure.url && (
            <Link
              href={procedure.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              // 行のクリック（時期の編集を開く）に拾わせない
              onClick={(event) => event.stopPropagation()}
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
            >
              公式ページ
              <OpenInNewIcon sx={{ fontSize: "0.875rem" }} />
            </Link>
          )}
        </Box>
      )}

      {hasNote && !noteOpen && (
        <Typography
          variant="caption"
          color="text.secondary"
          onClick={() => setNoteOpen(true)}
          sx={{
            display: "block",
            cursor: "text",
            pl: "36px",
            pr: 1,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
          }}
        >
          {procedure.note}
        </Typography>
      )}

      {/*
        開くたびに再マウントして defaultValue を最新化する（閉じている間に
        別の家族の編集が router.refresh 経由で入っても古い値が残らないように）。
      */}
      <Collapse in={noteOpen} mountOnEnter unmountOnExit>
        <Stack sx={{ pt: 0.5, pl: "36px", pr: 1 }}>
          <TextField
            multiline
            minRows={1}
            size="small"
            variant="standard"
            placeholder="メモ"
            defaultValue={procedure.note ?? ""}
            onBlur={(event) => commitNote(event.target.value)}
            slotProps={{ htmlInput: { style: { fontSize: "1rem" } } }}
          />
        </Stack>
      </Collapse>

      <Collapse in={detailsOpen} mountOnEnter unmountOnExit>
        <Box sx={{ pt: 1, pl: "36px", pr: 1, pb: 0.5 }}>
          <TimingEditForm
            key={`${procedure.id}:${procedure.isGovernment}:${procedure.timingKind}:${procedure.anchorEvent}:${procedure.offsetDays}`}
            procedure={procedure}
            anchor={anchor}
            busy={busy}
            onSave={(change) => {
              onTimingChange(procedure.id, change);
              setDetailsOpen(false);
            }}
            onCancel={() => setDetailsOpen(false)}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * 「行政手続きか / 時期の硬さ / 基準日・オフセット」を1フォームで編集する。
 * 保存ボタンを押すまでローカル state のまま（複数項目を1操作で変えるので、
 * タイトル・メモの blur 自動保存とは分ける）。
 */
function TimingEditForm({
  procedure,
  anchor,
  busy,
  onSave,
  onCancel,
}: {
  procedure: LifeEventProcedure;
  anchor: LifeEventAnchorDates;
  busy: boolean;
  onSave: (change: TimingChange) => void;
  onCancel: () => void;
}) {
  const [isGovernment, setIsGovernment] = useState(procedure.isGovernment);
  const [timingKind, setTimingKind] = useState<string>(procedure.timingKind);
  const [anchorEvent, setAnchorEvent] = useState<string>(
    procedure.anchorEvent ?? "",
  );
  const [offsetDays, setOffsetDays] = useState<string>(
    procedure.offsetDays === null ? "" : String(procedure.offsetDays),
  );

  // 日数だけの入力は分かりにくいので、基準日が分かるならカレンダーでも指定できる
  // ようにする（相互に同期。保存されるのは常に offsetDays）。
  const referenceDate =
    anchorEvent === "birth"
      ? anchor.birthDate
      : anchorEvent === "expected_birth"
        ? anchor.expectedBirthDate
        : anchorEvent === "event_start"
          ? anchor.startedOn
          : null;
  const calendarDate =
    referenceDate !== null && offsetDays !== ""
      ? addDaysToDateString(referenceDate, Number(offsetDays))
      : "";

  function handleCalendarChange(value: string) {
    if (referenceDate === null) return;
    setOffsetDays(value === "" ? "" : String(daysUntil(value, referenceDate)));
  }

  return (
    <Stack spacing={1.5}>
      <FormControlLabel
        control={
          <Switch
            checked={isGovernment}
            onChange={(event) => setIsGovernment(event.target.checked)}
            size="small"
          />
        }
        label="行政手続き（出生届・児童手当など）"
        slotProps={{ typography: { variant: "body2" } }}
      />

      <TextField
        select
        label="時期の書き方"
        value={timingKind}
        onChange={(event) => setTimingKind(event.target.value)}
        size="small"
        fullWidth
        helperText={
          timingKind === "deadline"
            ? "「〜まで」と締切として出す"
            : "「〜ごろ」と目安として出す"
        }
      >
        {TIMING_KIND_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="いつを基準にするか"
        value={anchorEvent}
        onChange={(event) => setAnchorEvent(event.target.value)}
        size="small"
        fullWidth
      >
        <MenuItem value="">目安を出さない</MenuItem>
        {ANCHOR_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {anchorEvent !== "" && (
        <Stack direction="row" spacing={1}>
          <TextField
            label="日数（負=前）"
            type="number"
            value={offsetDays}
            onChange={(event) => setOffsetDays(event.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="目安の日付"
            type="date"
            value={calendarDate}
            onChange={(event) => handleCalendarChange(event.target.value)}
            size="small"
            sx={{ flex: 1 }}
            disabled={referenceDate === null}
            helperText={
              referenceDate === null
                ? "「家族」画面で日付を登録すると使えます"
                : undefined
            }
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      )}

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          disabled={busy}
          onClick={() =>
            onSave({ isGovernment, timingKind, anchorEvent, offsetDays })
          }
        >
          保存
        </Button>
        <Button size="small" onClick={onCancel} disabled={busy}>
          やめる
        </Button>
      </Stack>
    </Stack>
  );
}
