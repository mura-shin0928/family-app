"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  type ReactNode,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { SOON_DAYS } from "@/lib/constants";
import { todayInJst } from "@/lib/date";
import {
  createTask,
  deleteTask,
  setTaskDone,
  setTaskPurchase,
  updateTaskDueDate,
} from "../actions";
import {
  bucketOpenTasks,
  splitOpenAndCompletedToday,
  TASK_BUCKET_ORDER,
  type TaskBucketKey,
} from "../buckets";
import type { TaskDTO } from "../types";
import { QuickCaptureBar } from "./QuickCaptureBar";
import { TaskRow } from "./TaskRow";

const BUCKET_LABEL: Record<TaskBucketKey, string> = {
  overdue: "期限超過",
  today: "今日",
  soon: `そろそろ（〜${SOON_DAYS}日）`,
  upcoming: "それ以降の期限",
  none: "期限なし",
};

const COLLAPSIBLE_BUCKETS: readonly TaskBucketKey[] = ["upcoming", "none"];

const COMPLETED_TASK_HINT =
  "完了したタスクは翌日になると一覧から自動的に非表示になります（削除はされません）";

type Action =
  | { type: "add"; task: TaskDTO }
  | { type: "toggle"; id: string; done: boolean }
  | { type: "dueDate"; id: string; dueOn: string | null }
  | { type: "purchase"; id: string; isPurchase: boolean }
  | { type: "remove"; id: string };

function applyAction(tasks: TaskDTO[], action: Action): TaskDTO[] {
  switch (action.type) {
    case "add":
      // useOptimistic re-runs this reducer against the latest committed `tasks`
      // whenever it changes mid-transition, so this must stay idempotent or the
      // task added via setTasks below gets appended a second time.
      return tasks.some((task) => task.id === action.task.id)
        ? tasks
        : [...tasks, action.task];
    case "toggle":
      return tasks.map((task) =>
        task.id === action.id
          ? {
              ...task,
              status: action.done ? "done" : "open",
              completedAt: action.done ? new Date().toISOString() : null,
            }
          : task,
      );
    case "dueDate":
      return tasks.map((task) =>
        task.id === action.id ? { ...task, dueOn: action.dueOn } : task,
      );
    case "purchase":
      return tasks.map((task) =>
        task.id === action.id
          ? { ...task, isPurchase: action.isPurchase }
          : task,
      );
    case "remove":
      return tasks.filter((task) => task.id !== action.id);
  }
}

type Toast = { message: string; actionLabel?: string; onAction?: () => void };

function BucketSection({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Box component="section">
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {label}（{count}）
      </Typography>
      <Stack spacing={1}>{children}</Stack>
    </Box>
  );
}

function CollapsibleSection({
  label,
  count,
  defaultExpanded,
  children,
}: {
  label: string;
  count: number;
  defaultExpanded: boolean;
  children: ReactNode;
}) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={defaultExpanded}
      sx={{ "&::before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}（{count}）
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function CompletedSection({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={false}
      sx={{ "&::before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="subtitle2" color="text.secondary">
            完了（今日 {count}）
          </Typography>
          <Tooltip title={COMPLETED_TASK_HINT}>
            <InfoOutlinedIcon
              fontSize="inherit"
              tabIndex={0}
              titleAccess={COMPLETED_TASK_HINT}
              onClick={(event) => event.stopPropagation()}
              sx={{ color: "text.disabled", cursor: "help" }}
            />
          </Tooltip>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export function TaskListScreen({ initialTasks }: { initialTasks: TaskDTO[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  useEffect(() => setTasks(initialTasks), [initialTasks]);

  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, applyAction);
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<TaskDTO | null>(
    null,
  );
  const [showPurchaseOnly, setShowPurchaseOnly] = useState(false);

  function showToast(next: Toast) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  const today = todayInJst();
  const { open, completedToday } = splitOpenAndCompletedToday(optimisticTasks);
  const buckets = bucketOpenTasks(open, today);
  const isEmpty = open.length === 0 && completedToday.length === 0;

  // 買うものだけ表示: 期限の緊急度ではなく、売り場を回る順（sort_order）で見せる。
  const purchaseOpen = open
    .filter((task) => task.isPurchase)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const purchaseCompletedToday = completedToday.filter(
    (task) => task.isPurchase,
  );

  function handleCreate(input: {
    title: string;
    dueOn: string | null;
    isPurchase: boolean;
  }) {
    const id = crypto.randomUUID();
    const optimisticTask: TaskDTO = {
      id,
      title: input.title,
      dueOn: input.dueOn,
      isPurchase: input.isPurchase,
      status: "open",
      completedAt: null,
      sortOrder: Number.MAX_SAFE_INTEGER,
    };

    startTransition(async () => {
      applyOptimistic({ type: "add", task: optimisticTask });
      const result = await createTask({
        id,
        title: input.title,
        dueOn: input.dueOn ?? "",
        isPurchase: input.isPurchase,
      });
      if (result.ok) {
        setTasks((prev) =>
          applyAction(prev, { type: "add", task: optimisticTask }),
        );
      } else {
        showToast({ message: result.error });
      }
    });
  }

  function applyToggle(taskId: string, done: boolean) {
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: taskId, done });
      const result = await setTaskDone({ taskId, done });
      if (result.ok) {
        setTasks((prev) =>
          applyAction(prev, { type: "toggle", id: taskId, done }),
        );
        if (done) {
          showToast({
            message: "完了しました",
            actionLabel: "元に戻す",
            onAction: () => applyToggle(taskId, false),
          });
        }
      } else {
        showToast({ message: result.error });
      }
    });
  }

  function handleToggle(task: TaskDTO) {
    applyToggle(task.id, task.status !== "done");
  }

  function handleDueDateChange(task: TaskDTO, dueOn: string | null) {
    startTransition(async () => {
      applyOptimistic({ type: "dueDate", id: task.id, dueOn });
      const result = await updateTaskDueDate({
        taskId: task.id,
        dueOn: dueOn ?? "",
      });
      if (result.ok) {
        setTasks((prev) =>
          applyAction(prev, { type: "dueDate", id: task.id, dueOn }),
        );
      } else {
        showToast({ message: result.error });
      }
    });
  }

  function handlePurchaseToggle(task: TaskDTO) {
    const isPurchase = !task.isPurchase;
    startTransition(async () => {
      applyOptimistic({ type: "purchase", id: task.id, isPurchase });
      const result = await setTaskPurchase({ taskId: task.id, isPurchase });
      if (result.ok) {
        setTasks((prev) =>
          applyAction(prev, { type: "purchase", id: task.id, isPurchase }),
        );
      } else {
        showToast({ message: result.error });
      }
    });
  }

  function performDelete(task: TaskDTO) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: task.id });
      const result = await deleteTask({ taskId: task.id });
      if (result.ok) {
        setTasks((prev) => applyAction(prev, { type: "remove", id: task.id }));
      } else {
        showToast({ message: result.error });
      }
    });
  }

  const visibleBuckets = TASK_BUCKET_ORDER.filter(
    (key) => !COLLAPSIBLE_BUCKETS.includes(key),
  );

  const rowHandlers = {
    onToggle: handleToggle,
    onDueDateChange: handleDueDateChange,
    onPurchaseToggle: handlePurchaseToggle,
    onDelete: setTaskPendingDelete,
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", pb: 20 }}>
      <Stack spacing={3} sx={{ flex: 1, px: 2, py: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Chip
            icon={
              showPurchaseOnly ? (
                <ShoppingCartIcon />
              ) : (
                <ShoppingCartOutlinedIcon />
              )
            }
            label="買うものだけ表示"
            clickable
            color={showPurchaseOnly ? "primary" : "default"}
            variant={showPurchaseOnly ? "filled" : "outlined"}
            onClick={() => setShowPurchaseOnly((current) => !current)}
          />
        </Box>

        {showPurchaseOnly ? (
          <>
            {purchaseOpen.length > 0 && (
              <BucketSection label="買うもの" count={purchaseOpen.length}>
                {purchaseOpen.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    {...rowHandlers}
                  />
                ))}
              </BucketSection>
            )}

            {purchaseCompletedToday.length > 0 && (
              <CompletedSection count={purchaseCompletedToday.length}>
                {purchaseCompletedToday.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    {...rowHandlers}
                  />
                ))}
              </CompletedSection>
            )}

            {purchaseOpen.length === 0 &&
              purchaseCompletedToday.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ py: 8 }}
                >
                  買うものはありません。
                </Typography>
              )}
          </>
        ) : (
          <>
            {visibleBuckets.map((key) =>
              buckets[key].length > 0 ? (
                <BucketSection
                  key={key}
                  label={BUCKET_LABEL[key]}
                  count={buckets[key].length}
                >
                  {buckets[key].map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      today={today}
                      {...rowHandlers}
                    />
                  ))}
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
                  {buckets[key].map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      today={today}
                      {...rowHandlers}
                    />
                  ))}
                </CollapsibleSection>
              ) : null,
            )}

            {completedToday.length > 0 && (
              <CompletedSection count={completedToday.length}>
                {completedToday.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    {...rowHandlers}
                  />
                ))}
              </CompletedSection>
            )}

            {isEmpty && (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ py: 8 }}
              >
                今やることはありません。ゆっくりどうぞ。
              </Typography>
            )}
          </>
        )}
      </Stack>

      <QuickCaptureBar onSubmit={handleCreate} />

      <Snackbar
        open={!!toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: 96 }}
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

      <Dialog
        open={!!taskPendingDelete}
        onClose={() => setTaskPendingDelete(null)}
      >
        <DialogTitle>削除しますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            「{taskPendingDelete?.title}」を削除しますか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskPendingDelete(null)}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (taskPendingDelete) performDelete(taskPendingDelete);
              setTaskPendingDelete(null);
            }}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
