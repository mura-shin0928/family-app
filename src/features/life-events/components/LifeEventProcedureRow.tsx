"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import NotesIcon from "@mui/icons-material/Notes";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { LifeEventProcedure } from "../types";

type Props = {
  procedure: LifeEventProcedure;
  /** 並べ替えの保存待ちの間はハンドルを止めて、drop 前の連続ドラッグを防ぐ。 */
  busy: boolean;
  onTitleChange: (id: string, title: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onDelete: (procedure: LifeEventProcedure) => void;
};

export function LifeEventProcedureRow({
  procedure,
  busy,
  onTitleChange,
  onNoteChange,
  onDelete,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const hasNote = !!procedure.note;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: procedure.id, disabled: busy });

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
          disabled={busy}
          aria-label="ドラッグして並べ替え"
          size="small"
          disableRipple
          sx={{
            color: "text.disabled",
            cursor: busy ? "default" : "grab",
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
          onClick={() => onDelete(procedure)}
          aria-label="削除"
          size="small"
          sx={{ color: "text.disabled" }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

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
    </Box>
  );
}
