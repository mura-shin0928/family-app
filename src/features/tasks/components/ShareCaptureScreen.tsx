"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/layout";
import { createTask } from "../actions";
import { fetchTasks } from "../query-actions";
import type { ShareDraft } from "../share-input";
import { TASKS_QUERY_KEY } from "../types";

type Kind = "todo" | "purchase";

type Props = {
  initial: ShareDraft;
};

export function ShareCaptureScreen({ initial }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // 再送しても同じidになるよう、画面を開いた時点で固定する（連打で2件作らない）。
  const [taskId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(initial.title);
  const [kind, setKind] = useState<Kind>("todo");
  const [note, setNote] = useState(initial.note);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await createTask({
      id: taskId,
      title,
      dueOn: "",
      isPurchase: kind === "purchase",
      purchaseLocationId: "",
      recordChildId: "",
      url: initial.url,
      note,
    });

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    // 先読み済みの /tasks は追加前の一覧を持っているので、キャッシュを最新にしてから移る。
    await queryClient
      .fetchQuery({
        queryKey: TASKS_QUERY_KEY,
        queryFn: fetchTasks,
        staleTime: 0,
      })
      .catch(() => undefined);
    router.replace("/tasks");
  }

  return (
    <Stack
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: "100%",
        maxWidth: 480,
        mx: "auto",
        p: 2,
        pb: BOTTOM_NAV_CLEARANCE,
        gap: 2,
      }}
    >
      <TextField
        label="タイトル"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        autoFocus
        fullWidth
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        color="primary"
        value={kind}
        onChange={(_, next: Kind | null) => {
          if (next) setKind(next);
        }}
        aria-label="種類"
      >
        <ToggleButton value="todo">やること</ToggleButton>
        <ToggleButton value="purchase">買うもの</ToggleButton>
      </ToggleButtonGroup>

      {initial.url !== "" && (
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            リンク
          </Typography>
          <Typography variant="body2" noWrap title={initial.url}>
            {initial.url}
          </Typography>
        </Box>
      )}

      {initial.note !== "" && (
        <TextField
          label="メモ"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={2}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 2000 } }}
        />
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={() => router.replace("/tasks")} disabled={submitting}>
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || title.trim() === ""}
        >
          追加
        </Button>
      </Stack>
    </Stack>
  );
}
