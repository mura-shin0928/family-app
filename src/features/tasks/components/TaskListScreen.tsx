"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useRef, useState } from "react";
import { SOON_DAYS } from "@/lib/constants";
import { todayInJst } from "@/lib/date";
import {
  type ActionResult,
  createTask,
  deleteTask,
  setTaskDone,
  setTaskPurchase,
  updateTaskDueDate,
  updateTaskTitle,
} from "../actions";
import {
  bucketOpenTasks,
  splitOpenAndCompletedToday,
  TASK_BUCKET_ORDER,
  type TaskBucketKey,
} from "../buckets";
import { fetchTasks } from "../query-actions";
import { TASKS_QUERY_KEY, type TaskDTO } from "../types";
import { QuickCaptureBar } from "./QuickCaptureBar";
import { TaskRow } from "./TaskRow";
import { useTasksRealtime } from "./useTasksRealtime";

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
  | { type: "title"; id: string; title: string }
  | { type: "remove"; id: string };

function applyAction(tasks: TaskDTO[], action: Action): TaskDTO[] {
  switch (action.type) {
    case "add":
      return [...tasks, action.task];
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
    case "title":
      return tasks.map((task) =>
        task.id === action.id ? { ...task, title: action.title } : task,
      );
    case "remove":
      return tasks.filter((task) => task.id !== action.id);
  }
}

type Toast = { message: string; actionLabel?: string; onAction?: () => void };

type OptimisticMutationContext = { previous: TaskDTO[] | undefined };

/**
 * 5つのタスク操作に共通する「楽観更新→サーバー呼び出し→失敗時ロールバック→
 * 完了後invalidate」の骨格。サーバーをsource of truthとして扱うため、
 * 成功時もローカルの楽観値を確定値として使い続けず、必ず再取得させる。
 */
function useOptimisticTasksMutation<TInput>(
  mutationFn: (input: TInput) => Promise<ActionResult>,
  toAction: (input: TInput) => Action,
  handlers?: {
    onOk?: (input: TInput) => void;
    onFail?: (error: string) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation<
    ActionResult,
    Error,
    TInput,
    OptimisticMutationContext | undefined
  >({
    mutationFn,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = queryClient.getQueryData<TaskDTO[]>(TASKS_QUERY_KEY);
      queryClient.setQueryData<TaskDTO[]>(TASKS_QUERY_KEY, (current) =>
        applyAction(current ?? [], toAction(input)),
      );
      return { previous };
    },
    onSuccess: (result, input, context) => {
      if (result.ok) {
        handlers?.onOk?.(input);
        return;
      }
      if (context?.previous) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previous);
      }
      handlers?.onFail?.(result.error);
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previous);
      }
      handlers?.onFail?.("通信に失敗しました");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

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

/**
 * BucketSection と同じ見た目（Paper/カード枠なし）の折りたたみ見出し。
 * MUIのAccordionはPaper+角丸+線を持つため、通常の見出しと並べると
 * それだけ「かさばって」見える — Collapseで組み直し、視覚的な重さを揃える。
 */
function CollapsibleHeader({
  title,
  expanded,
  onToggle,
  extra,
}: {
  title: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  extra?: ReactNode;
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        cursor: "pointer",
        mb: 1,
      }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      {extra}
      <ExpandMoreIcon
        fontSize="small"
        sx={{
          color: "text.secondary",
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.15s",
        }}
      />
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
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <Box component="section">
      <CollapsibleHeader
        title={`${label}（${count}）`}
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
      />
      <Collapse in={expanded}>
        <Stack spacing={1}>{children}</Stack>
      </Collapse>
    </Box>
  );
}

function CompletedSection({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleHint() {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintOpen((current) => {
      const next = !current;
      if (next) {
        hintTimer.current = setTimeout(() => setHintOpen(false), 4000);
      }
      return next;
    });
  }

  return (
    <Box component="section">
      <CollapsibleHeader
        title={`完了（今日 ${count}）`}
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        extra={
          // MUIのTooltipはhover前提のためタッチ操作では長押し(既定約0.7秒)が
          // 必要になり、単純なタップだと開かないことがある。ここではタップの
          // クリックイベントだけで開閉を制御し、自動でも4秒後に閉じる。
          <Tooltip
            title={COMPLETED_TASK_HINT}
            open={hintOpen}
            onClose={() => setHintOpen(false)}
            disableFocusListener
            disableHoverListener
            disableTouchListener
          >
            <InfoOutlinedIcon
              fontSize="inherit"
              tabIndex={0}
              titleAccess={COMPLETED_TASK_HINT}
              onClick={(event) => {
                event.stopPropagation();
                toggleHint();
              }}
              sx={{ color: "text.disabled", cursor: "help" }}
            />
          </Tooltip>
        }
      />
      <Collapse in={expanded}>
        <Stack spacing={1}>{children}</Stack>
      </Collapse>
    </Box>
  );
}

export function TaskListScreen({
  initialTasks,
  familyId,
}: {
  initialTasks: TaskDTO[];
  familyId: string;
}) {
  const { data: tasks = [] } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    initialData: initialTasks,
  });

  useTasksRealtime(familyId);

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

  const createMutation = useOptimisticTasksMutation(
    createTask,
    (input: {
      id: string;
      title: string;
      dueOn: string;
      isPurchase: boolean;
    }): Action => ({
      type: "add",
      task: {
        id: input.id,
        title: input.title,
        dueOn: input.dueOn === "" ? null : input.dueOn,
        isPurchase: input.isPurchase,
        status: "open",
        completedAt: null,
        sortOrder: Number.MAX_SAFE_INTEGER,
      },
    }),
    { onFail: (error) => showToast({ message: error }) },
  );

  const toggleMutation = useOptimisticTasksMutation(
    setTaskDone,
    (input: { taskId: string; done: boolean }): Action => ({
      type: "toggle",
      id: input.taskId,
      done: input.done,
    }),
    {
      onOk: (input) => {
        if (input.done) {
          showToast({
            message: "完了しました",
            actionLabel: "元に戻す",
            onAction: () =>
              toggleMutation.mutate({ taskId: input.taskId, done: false }),
          });
        }
      },
      onFail: (error) => showToast({ message: error }),
    },
  );

  const dueDateMutation = useOptimisticTasksMutation(
    updateTaskDueDate,
    (input: { taskId: string; dueOn: string }): Action => ({
      type: "dueDate",
      id: input.taskId,
      dueOn: input.dueOn === "" ? null : input.dueOn,
    }),
    { onFail: (error) => showToast({ message: error }) },
  );

  const titleMutation = useOptimisticTasksMutation(
    updateTaskTitle,
    (input: { taskId: string; title: string }): Action => ({
      type: "title",
      id: input.taskId,
      title: input.title,
    }),
    { onFail: (error) => showToast({ message: error }) },
  );

  const purchaseMutation = useOptimisticTasksMutation(
    setTaskPurchase,
    (input: { taskId: string; isPurchase: boolean }): Action => ({
      type: "purchase",
      id: input.taskId,
      isPurchase: input.isPurchase,
    }),
    { onFail: (error) => showToast({ message: error }) },
  );

  const deleteMutation = useOptimisticTasksMutation(
    deleteTask,
    (input: { taskId: string }): Action => ({
      type: "remove",
      id: input.taskId,
    }),
    { onFail: (error) => showToast({ message: error }) },
  );

  const today = todayInJst();
  const { open, completedToday } = splitOpenAndCompletedToday(tasks);
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
    createMutation.mutate({
      id: crypto.randomUUID(),
      title: input.title,
      dueOn: input.dueOn ?? "",
      isPurchase: input.isPurchase,
    });
  }

  function handleToggle(task: TaskDTO) {
    toggleMutation.mutate({ taskId: task.id, done: task.status !== "done" });
  }

  function handleDueDateChange(task: TaskDTO, dueOn: string | null) {
    dueDateMutation.mutate({ taskId: task.id, dueOn: dueOn ?? "" });
  }

  function handleTitleChange(task: TaskDTO, title: string) {
    if (title === task.title) return;
    titleMutation.mutate({ taskId: task.id, title });
  }

  function handlePurchaseToggle(task: TaskDTO) {
    purchaseMutation.mutate({
      taskId: task.id,
      isPurchase: !task.isPurchase,
    });
  }

  function performDelete(task: TaskDTO) {
    deleteMutation.mutate({ taskId: task.id });
  }

  const visibleBuckets = TASK_BUCKET_ORDER.filter(
    (key) => !COLLAPSIBLE_BUCKETS.includes(key),
  );

  const rowHandlers = {
    onToggle: handleToggle,
    onDueDateChange: handleDueDateChange,
    onTitleChange: handleTitleChange,
    onPurchaseToggle: handlePurchaseToggle,
    onDelete: setTaskPendingDelete,
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", pb: 27 }}>
      <Stack spacing={2} sx={{ flex: 1, px: 2, py: 2 }}>
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
