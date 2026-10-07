"use client";

import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Child } from "@/features/children/types";
import type { PurchaseLocation } from "@/features/purchase-locations/types";
import { SOON_DAYS } from "@/lib/constants";
import { todayInJst } from "@/lib/date";
import {
  bucketOpenTasks,
  splitOpenAndCompletedToday,
  TASK_BUCKET_ORDER,
  type TaskBucketKey,
  todayProgress,
} from "../buckets";
import { fetchTasks } from "../query-actions";
import { TASKS_QUERY_KEY, type TaskDTO } from "../types";
import { MascotSpeech } from "./MascotSpeech";
import { PurchaseTaskList } from "./PurchaseTaskList";
import { QuickCaptureBar } from "./QuickCaptureBar";
import { TaskEditSheet } from "./TaskEditSheet";
import { TaskRow } from "./TaskRow";
import {
  BucketSection,
  CollapsibleSection,
  CompletedSection,
} from "./TaskSections";
import { type TaskToast, useTaskMutations } from "./useTaskMutations";
import { useTasksRealtime } from "./useTasksRealtime";

const BUCKET_LABEL: Record<TaskBucketKey, string> = {
  overdue: "期限超過",
  today: "今日",
  soon: `そろそろ（〜${SOON_DAYS}日）`,
  upcoming: "それ以降の期限",
  none: "期限なし",
};

const COLLAPSIBLE_BUCKETS: readonly TaskBucketKey[] = ["upcoming", "none"];

export function TaskListScreen({
  initialTasks,
  familyId,
  locations,
  familyChildren,
}: {
  initialTasks: TaskDTO[];
  familyId: string;
  // 買う場所の候補。RSC の props で受け取るだけ（TanStack Query も Realtime も使わない）。
  locations: PurchaseLocation[];
  familyChildren: Child[];
}) {
  const { data: tasks = [] } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    initialData: initialTasks,
  });

  useTasksRealtime(familyId);

  const [toast, setToast] = useState<TaskToast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showPurchaseOnly, setShowPurchaseOnly] = useState(false);

  function showToast(next: TaskToast) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  const mutations = useTaskMutations(showToast);

  const today = todayInJst();
  const { open, completedToday } = splitOpenAndCompletedToday(tasks);
  const buckets = bucketOpenTasks(open, today);
  const progress = todayProgress(buckets, completedToday.length);

  function handleCreate(input: {
    title: string;
    dueOn: string | null;
    isPurchase: boolean;
    purchaseLocationId: string | null;
    recordChildId: string | null;
  }) {
    mutations.create({
      id: crypto.randomUUID(),
      title: input.title,
      dueOn: input.dueOn ?? "",
      isPurchase: input.isPurchase,
      purchaseLocationId: input.purchaseLocationId ?? "",
      recordChildId: input.recordChildId ?? "",
    });
  }

  const visibleBuckets = TASK_BUCKET_ORDER.filter(
    (key) => !COLLAPSIBLE_BUCKETS.includes(key),
  );

  const childNameById = new Map(
    familyChildren.map((child) => [child.id, child.displayName]),
  );

  function recordChildNameOf(task: TaskDTO): string | null {
    return task.recordChildId
      ? (childNameById.get(task.recordChildId) ?? null)
      : null;
  }

  function renderRow(task: TaskDTO) {
    return (
      <TaskRow
        key={task.id}
        task={task}
        today={today}
        recordChildName={recordChildNameOf(task)}
        locations={locations}
        onToggle={(target) =>
          mutations.toggle({
            taskId: target.id,
            done: target.status !== "done",
          })
        }
        onOpen={(target) => setEditingTaskId(target.id)}
      />
    );
  }

  // 開いている間に削除された（Realtime 等）ら見つからなくなり、シートは閉じる。
  const editingTask = editingTaskId
    ? (tasks.find((task) => task.id === editingTaskId) ?? null)
    : null;

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", pb: 27 }}>
      <Stack spacing={2} sx={{ flex: 1, px: 2, py: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <IconButton
            component={Link}
            href="/tasks/settings"
            size="small"
            aria-label="一覧の設定"
            sx={{ color: "text.secondary" }}
          >
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>
          <Chip
            icon={
              showPurchaseOnly ? (
                <ShoppingCartIcon />
              ) : (
                <ShoppingCartOutlinedIcon />
              )
            }
            label="買うもの"
            clickable
            color={showPurchaseOnly ? "primary" : "default"}
            variant={showPurchaseOnly ? "filled" : "outlined"}
            onClick={() => setShowPurchaseOnly((current) => !current)}
          />
        </Box>

        {showPurchaseOnly ? (
          <PurchaseTaskList
            open={open}
            completedToday={completedToday}
            locations={locations}
            renderRow={renderRow}
          />
        ) : (
          <>
            <MascotSpeech
              key={progress}
              progress={progress}
              large={open.length === 0}
            />

            {visibleBuckets.map((key) =>
              buckets[key].length > 0 ? (
                <BucketSection
                  key={key}
                  label={BUCKET_LABEL[key]}
                  count={buckets[key].length}
                >
                  {buckets[key].map(renderRow)}
                </BucketSection>
              ) : null,
            )}

            {COLLAPSIBLE_BUCKETS.map((key) =>
              buckets[key].length > 0 ? (
                <CollapsibleSection
                  key={key}
                  label={BUCKET_LABEL[key]}
                  count={buckets[key].length}
                  defaultExpanded
                >
                  {buckets[key].map(renderRow)}
                </CollapsibleSection>
              ) : null,
            )}

            {completedToday.length > 0 && (
              <CompletedSection count={completedToday.length}>
                {completedToday.map(renderRow)}
              </CompletedSection>
            )}
          </>
        )}
      </Stack>

      <QuickCaptureBar
        locations={locations}
        familyChildren={familyChildren}
        onSubmit={handleCreate}
      />

      <Snackbar
        open={!!toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: 152 }}
        message={toast?.message}
        action={
          toast?.actionLabel ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
            >
              {toast.actionLabel}
            </Button>
          ) : undefined
        }
      />

      <TaskEditSheet
        task={editingTask}
        locations={locations}
        familyChildren={familyChildren}
        onSave={(task, patch) => {
          mutations.update({ taskId: task.id, ...patch });
          setEditingTaskId(null);
        }}
        onDelete={(task) => {
          mutations.remove({ taskId: task.id });
          setEditingTaskId(null);
        }}
        onClose={() => setEditingTaskId(null)}
      />
    </Box>
  );
}
