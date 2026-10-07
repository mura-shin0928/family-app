"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/action-result";
import { errorToast, type ResultToast, successToast } from "@/lib/result-toast";
import { createTask, deleteTask, setTaskDone, updateTask } from "../actions";
import { patchToTaskFields, type TaskUpdatePatch } from "../edit-draft";
import {
  applyTaskAction,
  type CreateTaskInput,
  optimisticTaskFromCreateInput,
  type TaskAction,
} from "../optimistic-actions";
import { TASKS_QUERY_KEY, type TaskDTO } from "../types";

export type TaskToast = ResultToast & {
  actionLabel?: string;
  onAction?: () => void;
};

type OptimisticMutationContext = { previous: TaskDTO[] | undefined };

/**
 * タスク操作に共通する「楽観更新→サーバー呼び出し→失敗時ロールバック→
 * 完了後invalidate」の骨格。サーバーをsource of truthとして扱うため、
 * 成功時もローカルの楽観値を確定値として使い続けず、必ず再取得させる。
 */
function useOptimisticTasksMutation<TInput>(
  mutationFn: (input: TInput) => Promise<ActionResult>,
  toAction: (input: TInput) => TaskAction,
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
        applyTaskAction(current ?? [], toAction(input)),
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

/**
 * タスク一覧の作成・完了切替・更新・削除。どれも一覧のキャッシュへ先に反映する。
 * 失敗と、完了にしたときの「元に戻す」は showToast で知らせる。
 */
export function useTaskMutations(showToast: (toast: TaskToast) => void) {
  const onFail = (error: string) => showToast(errorToast(error));

  const createMutation = useOptimisticTasksMutation(
    createTask,
    (input: CreateTaskInput): TaskAction => ({
      type: "add",
      task: optimisticTaskFromCreateInput(input),
    }),
    { onFail },
  );

  const toggleMutation = useOptimisticTasksMutation(
    setTaskDone,
    (input: { taskId: string; done: boolean }): TaskAction => ({
      type: "toggle",
      id: input.taskId,
      done: input.done,
      now: new Date().toISOString(),
    }),
    {
      onOk: (input) => {
        if (input.done) {
          showToast({
            ...successToast("完了しました"),
            actionLabel: "元に戻す",
            onAction: () =>
              toggleMutation.mutate({ taskId: input.taskId, done: false }),
          });
        }
      },
      onFail,
    },
  );

  const updateMutation = useOptimisticTasksMutation(
    updateTask,
    ({
      taskId,
      ...patch
    }: { taskId: string } & TaskUpdatePatch): TaskAction => ({
      type: "update",
      id: taskId,
      fields: patchToTaskFields(patch),
    }),
    { onFail },
  );

  const deleteMutation = useOptimisticTasksMutation(
    deleteTask,
    (input: { taskId: string }): TaskAction => ({
      type: "remove",
      id: input.taskId,
    }),
    { onFail },
  );

  return {
    create: createMutation.mutate,
    toggle: toggleMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
  };
}
