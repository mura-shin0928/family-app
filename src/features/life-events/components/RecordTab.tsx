"use client";

import MoreHoriz from "@mui/icons-material/MoreHoriz";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TASKS_QUERY_KEY } from "@/features/tasks/types";
import {
  removeLifeEventItem,
  updateLifeEventItemDoneOn,
  updateLifeEventItemNote,
} from "../item-actions";
import { formatSlashDate } from "../timing";
import type { LifeEventItem } from "../types";
import { RecordDoneDialog } from "./RecordDoneDialog";

const NOTE_MAX_LENGTH = 2000;

type DoneItem = LifeEventItem & { doneOn: string };

function sortDone(items: LifeEventItem[]): DoneItem[] {
  return items
    .filter((item): item is DoneItem => item.doneOn !== null)
    .sort(
      (a, b) =>
        b.doneOn.localeCompare(a.doneOn) ||
        a.title.localeCompare(b.title, "ja"),
    );
}

function monthHeading(doneOn: string): string {
  const [year, month] = doneOn.split("-");
  return `${year}年${Number(month)}月`;
}

function firstLine(note: string): string {
  return note.split("\n")[0] ?? "";
}

/** その子の記録（done の項目）を、やった日の新しい順に月ごとに並べる。 */
export function RecordTab({ items }: { items: LifeEventItem[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    anchor: HTMLElement;
    item: DoneItem;
  } | null>(null);
  const [dateTarget, setDateTarget] = useState<DoneItem | null>(null);
  const [noteTarget, setNoteTarget] = useState<DoneItem | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [removeTarget, setRemoveTarget] = useState<DoneItem | null>(null);

  const sorted = sortDone(items);

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    onDone: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      router.refresh();
    });
  }

  function openNote(item: DoneItem) {
    setError(null);
    setNoteDraft(item.note ?? "");
    setNoteTarget(item);
  }

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
        まだ記録はありません。探すタブの「もうやった」か、タスクの完了で記録されます
      </Typography>
    );
  }

  const groups: { heading: string; rows: DoneItem[] }[] = [];
  for (const item of sorted) {
    const heading = monthHeading(item.doneOn);
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.rows.push(item);
    else groups.push({ heading, rows: [item] });
  }

  return (
    <Stack spacing={2}>
      {error && !dateTarget && !noteTarget && !removeTarget && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {groups.map((group) => (
        <Box key={group.heading}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {group.heading}
          </Typography>
          <Stack
            divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
          >
            {group.rows.map((item) => (
              <Stack
                key={item.id}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", py: 1 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    minWidth: 40,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatSlashDate(item.doneOn).split("/").slice(1).join("/")}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1">{item.title}</Typography>
                  {item.note && (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      {firstLine(item.note)}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  aria-label={`${item.title}のメニュー`}
                  onClick={(event) =>
                    setMenu({ anchor: event.currentTarget, item })
                  }
                >
                  <MoreHoriz fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Box>
      ))}

      <Menu
        anchorEl={menu?.anchor}
        open={menu !== null}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          onClick={() => {
            if (!menu) return;
            setError(null);
            setDateTarget(menu.item);
            setMenu(null);
          }}
        >
          やった日を直す
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menu) return;
            openNote(menu.item);
            setMenu(null);
          }}
        >
          メモ
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menu) return;
            setError(null);
            setRemoveTarget(menu.item);
            setMenu(null);
          }}
        >
          記録から外す
        </MenuItem>
      </Menu>

      <RecordDoneDialog
        key={dateTarget?.id ?? "none"}
        target={
          dateTarget
            ? {
                title: dateTarget.title,
                initialDate: dateTarget.doneOn,
                heading: "やった日を直す",
              }
            : null
        }
        busy={isPending}
        error={error}
        onClose={() => setDateTarget(null)}
        onSubmit={(doneOn) => {
          if (!dateTarget) return;
          run(
            () => updateLifeEventItemDoneOn({ id: dateTarget.id, doneOn }),
            () => setDateTarget(null),
          );
        }}
      />

      <Dialog
        open={noteTarget !== null}
        onClose={() => setNoteTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>メモ</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">{noteTarget?.title}</Typography>
            <TextField
              label="メモ"
              multiline
              minRows={3}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              fullWidth
              slotProps={{
                htmlInput: {
                  maxLength: NOTE_MAX_LENGTH,
                  style: { fontSize: "1rem" },
                },
              }}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteTarget(null)} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            disabled={isPending}
            onClick={() => {
              if (!noteTarget) return;
              run(
                () =>
                  updateLifeEventItemNote({
                    id: noteTarget.id,
                    note: noteDraft.trim(),
                  }),
                () => setNoteTarget(null),
              );
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
      >
        <DialogTitle>記録から外しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {removeTarget?.title}
            <br />
            {removeTarget?.catalogKey ? "探すに戻ります" : "記録から消えます"}
          </DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            disabled={isPending}
            onClick={() => {
              if (!removeTarget) return;
              run(
                () => removeLifeEventItem({ id: removeTarget.id }),
                () => setRemoveTarget(null),
              );
            }}
          >
            外す
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
