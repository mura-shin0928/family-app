"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotesIcon from "@mui/icons-material/Notes";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { formatSlashDate } from "../timing";
import type { LifeEventProcedure } from "../types";

/** 「記録」区分。やった日の新しい順に並ぶ年表で、チェックや進捗の表現は持たない。 */
export function DoneProcedureTimeline({
  procedures,
  busy,
  onEditDate,
  onReopen,
  onNoteChange,
  onDelete,
}: {
  procedures: LifeEventProcedure[];
  busy: boolean;
  onEditDate: (procedure: LifeEventProcedure) => void;
  onReopen: (procedure: LifeEventProcedure) => void;
  onNoteChange: (id: string, note: string) => void;
  onDelete: (procedure: LifeEventProcedure) => void;
}) {
  if (procedures.length === 0) return null;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="textSecondary">
        記録 {procedures.length}
      </Typography>
      <Box sx={{ borderLeft: 2, borderColor: "divider", ml: 0.75, pl: 1.5 }}>
        {procedures.map((procedure) => (
          <DoneRow
            key={procedure.id}
            procedure={procedure}
            busy={busy}
            onEditDate={onEditDate}
            onReopen={onReopen}
            onNoteChange={onNoteChange}
            onDelete={onDelete}
          />
        ))}
      </Box>
    </Stack>
  );
}

function DoneRow({
  procedure,
  busy,
  onEditDate,
  onReopen,
  onNoteChange,
  onDelete,
}: {
  procedure: LifeEventProcedure;
  busy: boolean;
  onEditDate: (procedure: LifeEventProcedure) => void;
  onReopen: (procedure: LifeEventProcedure) => void;
  onNoteChange: (id: string, note: string) => void;
  onDelete: (procedure: LifeEventProcedure) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const hasNote = !!procedure.note;

  return (
    <Box sx={{ py: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ width: 76, flexShrink: 0 }}
        >
          {procedure.doneOn ? formatSlashDate(procedure.doneOn) : ""}
        </Typography>
        <Typography
          component="div"
          variant="body2"
          sx={{ flex: 1, minWidth: 0, overflowWrap: "break-word" }}
        >
          {procedure.title}
          {procedure.isGovernment && (
            <Chip label="行政手続き" size="small" sx={{ ml: 0.75 }} />
          )}
        </Typography>
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
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          aria-label="その他の操作"
          size="small"
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            disabled={busy}
            onClick={() => {
              setMenuAnchor(null);
              onEditDate(procedure);
            }}
          >
            <ListItemIcon>
              <EditCalendarIcon fontSize="small" />
            </ListItemIcon>
            やった日を直す
          </MenuItem>
          <MenuItem
            disabled={busy}
            onClick={() => {
              setMenuAnchor(null);
              onReopen(procedure);
            }}
          >
            <ListItemIcon>
              <UndoIcon fontSize="small" />
            </ListItemIcon>
            これからに戻す
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onDelete(procedure);
            }}
          >
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            削除
          </MenuItem>
        </Menu>
      </Box>

      {hasNote && !noteOpen && (
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ display: "block", pl: "80px", whiteSpace: "pre-wrap" }}
        >
          {procedure.note}
        </Typography>
      )}

      <Collapse in={noteOpen} mountOnEnter unmountOnExit>
        <Stack sx={{ pt: 0.5, pl: "80px" }}>
          <TextField
            multiline
            minRows={1}
            size="small"
            variant="standard"
            placeholder="メモ"
            defaultValue={procedure.note ?? ""}
            onBlur={(event) => {
              const trimmed = event.target.value.trim();
              if (trimmed !== (procedure.note ?? "")) {
                onNoteChange(procedure.id, trimmed);
              }
            }}
            slotProps={{ htmlInput: { style: { fontSize: "1rem" } } }}
          />
        </Stack>
      </Collapse>
    </Box>
  );
}
