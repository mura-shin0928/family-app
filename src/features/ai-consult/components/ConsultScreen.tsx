"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ChildDates } from "@/features/life-events/search";
import { resolveTargetDate } from "@/features/life-events/search";
import type { CatalogItem } from "@/features/life-events/types";
import { TASKS_QUERY_KEY } from "@/features/tasks/types";
import {
  addConsultTasks,
  type ConsultFailure,
  proposePlan,
  proposeQuestions,
} from "../actions";
import type { ConsultSubjectInput } from "../schema";
import { ConsultPlanStep, type PlannedItem } from "./ConsultPlanStep";
import { ConsultQuestionsStep } from "./ConsultQuestionsStep";
import { ConsultSubjectStep } from "./ConsultSubjectStep";
import { useCloseOnBack } from "./useCloseOnBack";

const TITLE_ID = "ai-consult-screen-title";

/** 何について相談するか。pick は選ぶところから、subject は質問から始める。 */
export type ConsultTarget =
  | { kind: "pick"; candidates: CatalogItem[] }
  | { kind: "subject"; subject: ConsultSubjectInput };

/** AI への相談を全画面で出す。target が null の間は閉じている。 */
export function ConsultScreen({
  childId,
  child,
  target,
  onClose,
  onAdded,
}: {
  childId: string;
  child: ChildDates;
  target: ConsultTarget | null;
  onClose: () => void;
  onAdded: (count: number) => void;
}) {
  const open = target !== null;
  const requestClose = useCloseOnBack(open, onClose);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={requestClose}
      aria-labelledby={TITLE_ID}
      slotProps={{
        paper: {
          sx: { bgcolor: "background.default", backgroundImage: "none" },
        },
      }}
    >
      {/* 閉じたら中身ごと捨てる。走っている要求の結果は閉じた画面に反映されない */}
      {target && (
        <ConsultContent
          childId={childId}
          child={child}
          target={target}
          onBack={requestClose}
          onAdded={(count) => {
            onAdded(count);
            requestClose();
          }}
        />
      )}
    </Dialog>
  );
}

function ConsultContent({
  childId,
  child,
  target,
  onBack,
  onAdded,
}: {
  childId: string;
  child: ChildDates;
  target: ConsultTarget;
  onBack: () => void;
  onAdded: (count: number) => void;
}) {
  const [subject, setSubject] = useState<ConsultSubjectInput | null>(
    target.kind === "subject" ? target.subject : null,
  );

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            size="small"
            sx={{ mr: 1 }}
            aria-label="戻る"
            onClick={onBack}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography id={TITLE_ID} variant="h6" component="h2" noWrap>
            {subject
              ? `${subject.title}のやること`
              : "やることを AI に相談する"}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          px: 2,
          pb: "calc(16px + env(safe-area-inset-bottom))",
          overflowY: "auto",
        }}
      >
        {subject ? (
          <ConsultFlow
            childId={childId}
            child={child}
            subject={subject}
            onAdded={onAdded}
          />
        ) : (
          <ConsultSubjectStep
            candidates={target.kind === "pick" ? target.candidates : []}
            onPick={setSubject}
          />
        )}
      </Box>
    </>
  );
}

function failureMessage(reason: ConsultFailure): string {
  return reason === "quota_exceeded"
    ? "今日の提案の回数を使い切りました。明日また試してください"
    : "提案を作れませんでした";
}

function ConsultFlow({
  childId,
  child,
  subject,
  onAdded,
}: {
  childId: string;
  child: ChildDates;
  subject: ConsultSubjectInput;
  onAdded: (count: number) => void;
}) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [items, setItems] = useState<PlannedItem[] | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);

  // 同じ題材で開き直したら質問を引き直さない（枠を使わない）
  const questions = useQuery({
    queryKey: [
      "ai-consult-questions",
      childId,
      subject.catalogKey ?? subject.title,
    ],
    queryFn: () => proposeQuestions({ childId, subject }),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const plan = useMutation({
    mutationFn: () => {
      const qs = questions.data?.ok ? questions.data.questions : [];
      return proposePlan({
        childId,
        subject,
        answers: qs.map((q, i) => ({ question: q.text, answer: answers[i] })),
      });
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      const planned = result.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      }));
      setItems(planned);
      setSearchSuggestions(result.searchSuggestions);
      setSelected(new Set(planned.map((item) => item.id)));
    },
  });

  const add = useMutation({
    mutationFn: (chosen: PlannedItem[]) =>
      addConsultTasks({
        childId,
        items: chosen.map((item) => ({
          id: item.id,
          title: item.title,
          dueOn: resolveTargetDate(item, child) ?? "",
          note: item.reason,
        })),
      }),
    // 画面を閉じた後に終わっても、タスクの一覧は新しくする
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      }
    },
  });

  // mutate に渡した callback は、閉じた（unmount した）後には呼ばれない
  function addChosen(chosen: PlannedItem[]) {
    setAddError(null);
    add.mutate(chosen, {
      onSuccess: (result) => {
        if (!result.ok) {
          setAddError(result.error);
          return;
        }
        onAdded(chosen.length);
      },
      onError: () => setAddError("タスクの追加に失敗しました"),
    });
  }

  if (items !== null) {
    return (
      <ConsultPlanStep
        items={items}
        searchSuggestions={searchSuggestions}
        child={child}
        selected={selected}
        onToggle={(id) =>
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onAdd={() => addChosen(items.filter((item) => selected.has(item.id)))}
        adding={add.isPending}
        error={addError}
      />
    );
  }

  if (plan.isPending) {
    return <ConsultLoading message="やることを考えています…" />;
  }
  const planFailure =
    plan.data && !plan.data.ok
      ? plan.data.reason
      : plan.isError
        ? "unavailable"
        : null;

  if (questions.isFetching) {
    return <ConsultLoading message="質問を考えています…" />;
  }
  const questionsFailure =
    questions.data && !questions.data.ok
      ? questions.data.reason
      : questions.isError
        ? "unavailable"
        : null;
  if (questionsFailure || !questions.data?.ok) {
    return (
      <Failure
        reason={questionsFailure ?? "unavailable"}
        onRetry={() => questions.refetch()}
      />
    );
  }

  return (
    <>
      {planFailure && (
        <Failure reason={planFailure} onRetry={() => plan.mutate()} />
      )}
      <ConsultQuestionsStep
        questions={questions.data.questions}
        answers={answers}
        onAnswer={(index, answer) =>
          setAnswers((prev) => ({ ...prev, [index]: answer }))
        }
        onSubmit={() => plan.mutate()}
      />
    </>
  );
}

function Failure({
  reason,
  onRetry,
}: {
  reason: ConsultFailure;
  onRetry: () => void;
}) {
  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {failureMessage(reason)}
      </Typography>
      {reason !== "quota_exceeded" && (
        <Button size="small" onClick={onRetry} sx={{ mt: 0.5 }}>
          もう一度試す
        </Button>
      )}
    </Box>
  );
}

/** 生成中の表示。提案の行に近い高さの骨組みを並べる。 */
function ConsultLoading({ message }: { message: string }) {
  return (
    <Box role="status" aria-live="polite" sx={{ pt: 1 }}>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 1,
        }}
      >
        <CircularProgress size={16} />
        {message}
      </Typography>
      {[70, 55, 80].map((width) => (
        <Box
          key={width}
          aria-hidden
          sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
        >
          <Skeleton variant="text" width={`${width}%`} />
          <Skeleton variant="text" width="40%" sx={{ fontSize: "0.75rem" }} />
          <Skeleton variant="text" />
        </Box>
      ))}
    </Box>
  );
}
