"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
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
import {
  type DoneItem,
  groupDoneItemsByMonth,
  sortDoneItems,
} from "../records";
import type { LifeEventItem } from "../types";
import { RecordDetailSheet } from "./RecordDetailSheet";
import { RecordDoneDialog } from "./RecordDoneDialog";
import { RecordNoteDialog } from "./RecordNoteDialog";
import { RecordRemoveDialog } from "./RecordRemoveDialog";
import { RecordRow } from "./RecordRow";

/** その子の記録（done の項目）を、やった日の新しい順に月ごとに並べる。 */
export function RecordTab({ items }: { items: LifeEventItem[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sheetItem, setSheetItem] = useState<DoneItem | null>(null);
  const [dateTarget, setDateTarget] = useState<DoneItem | null>(null);
  const [noteTarget, setNoteTarget] = useState<DoneItem | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [removeTarget, setRemoveTarget] = useState<DoneItem | null>(null);

  const sorted = sortDoneItems(items);

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

  if (sorted.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
        まだ記録はありません。探すタブの「もうやった」か、タスクの完了で記録されます
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {error && !dateTarget && !noteTarget && !removeTarget && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {groupDoneItemsByMonth(sorted).map((group) => (
        <Box key={group.heading}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {group.heading}
          </Typography>
          <Stack
            divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
          >
            {group.rows.map((item) => (
              <RecordRow
                key={item.id}
                item={item}
                onOpen={() => {
                  setError(null);
                  setSheetItem(item);
                }}
              />
            ))}
          </Stack>
        </Box>
      ))}

      <RecordDetailSheet
        item={sheetItem}
        onClose={() => setSheetItem(null)}
        onEditNote={(item) => {
          setError(null);
          setNoteDraft(item.note ?? "");
          setNoteTarget(item);
          setSheetItem(null);
        }}
        onEditDate={(item) => {
          setError(null);
          setDateTarget(item);
          setSheetItem(null);
        }}
        onRemove={(item) => {
          setError(null);
          setRemoveTarget(item);
          setSheetItem(null);
        }}
      />

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

      <RecordNoteDialog
        title={noteTarget ? noteTarget.title : null}
        draft={noteDraft}
        onDraftChange={setNoteDraft}
        busy={isPending}
        error={error}
        onClose={() => setNoteTarget(null)}
        onSave={() => {
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
      />

      <RecordRemoveDialog
        target={removeTarget}
        busy={isPending}
        error={error}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return;
          run(
            () => removeLifeEventItem({ id: removeTarget.id }),
            () => setRemoveTarget(null),
          );
        }}
      />
    </Stack>
  );
}
