"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Child } from "@/features/children/types";
import { deleteTask } from "@/features/tasks/actions";
import { TASKS_QUERY_KEY } from "@/features/tasks/types";
import { todayInJst } from "@/lib/date";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/layout";
import {
  addLifeEventItemToTask,
  recordLifeEventItemDone,
} from "../item-actions";
import type { CatalogItem, LifeEventItem } from "../types";
import { AddToTaskDialog } from "./AddToTaskDialog";
import { RecordDoneDialog } from "./RecordDoneDialog";
import { RecordTab } from "./RecordTab";
import { SearchTab } from "./SearchTab";

type Mode = "search" | "record";

export function LifeEventsScreen({
  familyChildren,
  items,
  showPrograms,
}: {
  familyChildren: Child[];
  items: LifeEventItem[];
  showPrograms: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeChildId, setActiveChildId] = useState(
    familyChildren[0]?.id ?? "",
  );
  const [mode, setMode] = useState<Mode>("search");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [taskDialog, setTaskDialog] = useState<{
    item: CatalogItem;
    presetDueOn: string;
  } | null>(null);
  const [doneDialog, setDoneDialog] = useState<CatalogItem | null>(null);
  const [toast, setToast] = useState<{ taskId: string } | null>(null);

  if (familyChildren.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/family" size="small">
              家族画面へ
            </Button>
          }
        >
          まず「家族」画面で子供を登録してください。ライフイベントは子供ごとに管理します（妊活中で予定日が未定でも登録できます）。
        </Alert>
      </Box>
    );
  }

  const activeChild =
    familyChildren.find((child) => child.id === activeChildId) ??
    familyChildren[0];

  function handleSubmitAddToTask(title: string, dueOn: string) {
    if (!taskDialog) return;
    const { item } = taskDialog;
    setError(null);
    startTransition(async () => {
      const result = await addLifeEventItemToTask({
        childId: activeChild.id,
        catalogKey: item.key,
        title,
        dueOn,
        url: item.url ?? "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTaskDialog(null);
      setToast({ taskId: result.taskId });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      router.refresh();
    });
  }

  function handleUndoAddToTask() {
    if (!toast) return;
    const { taskId } = toast;
    setToast(null);
    startTransition(async () => {
      const result = await deleteTask({ taskId });
      if (!result.ok) setError(result.error);
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      router.refresh();
    });
  }

  function handleSubmitDone(doneOn: string) {
    if (!doneDialog) return;
    const item = doneDialog;
    setError(null);
    startTransition(async () => {
      const result = await recordLifeEventItemDone({
        childId: activeChild.id,
        catalogKey: item.key,
        title: item.title,
        doneOn,
        url: item.url ?? "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDoneDialog(null);
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      router.refresh();
    });
  }

  return (
    <Box sx={{ p: 2, pb: BOTTOM_NAV_CLEARANCE }}>
      <Stack spacing={2}>
        {familyChildren.length > 1 && (
          <Tabs
            value={activeChild.id}
            onChange={(_, value) => setActiveChildId(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            {familyChildren.map((child) => (
              <Tab key={child.id} value={child.id} label={child.displayName} />
            ))}
          </Tabs>
        )}

        <ToggleButtonGroup
          value={mode}
          exclusive
          size="small"
          fullWidth
          onChange={(_, value: Mode | null) => {
            if (value) setMode(value);
          }}
        >
          <ToggleButton value="search">探す</ToggleButton>
          <ToggleButton value="record">記録</ToggleButton>
        </ToggleButtonGroup>

        {error && !taskDialog && !doneDialog && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {mode === "search" ? (
          <SearchTab
            key={activeChild.id}
            child={activeChild}
            items={items}
            showPrograms={showPrograms}
            onAddToTask={(item, presetDueOn) => {
              setError(null);
              setTaskDialog({ item, presetDueOn });
            }}
            onRecordDone={(item) => {
              setError(null);
              setDoneDialog(item);
            }}
          />
        ) : (
          <RecordTab
            key={activeChild.id}
            items={items.filter(
              (item) =>
                item.childId === activeChild.id && item.status === "done",
            )}
          />
        )}
      </Stack>

      <AddToTaskDialog
        key={`task:${taskDialog?.item.key ?? "none"}`}
        target={
          taskDialog
            ? {
                title: taskDialog.item.title,
                presetDueOn: taskDialog.presetDueOn,
              }
            : null
        }
        busy={isPending}
        error={error}
        onClose={() => setTaskDialog(null)}
        onSubmit={handleSubmitAddToTask}
      />

      <RecordDoneDialog
        key={`done:${doneDialog?.key ?? "none"}`}
        target={
          doneDialog
            ? {
                title: doneDialog.title,
                initialDate: todayInJst(),
                heading: "やった日を記録",
              }
            : null
        }
        busy={isPending}
        error={error}
        onClose={() => setDoneDialog(null)}
        onSubmit={handleSubmitDone}
      />

      <Snackbar
        open={!!toast}
        onClose={() => setToast(null)}
        autoHideDuration={8000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: 72 }}
        message="タスクに追加しました"
        action={
          <Button color="inherit" size="small" onClick={handleUndoAddToTask}>
            元に戻す
          </Button>
        }
      />
    </Box>
  );
}
