"use client";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { type FormEvent, useId, useState } from "react";
import { addDaysToDateString, todayInJst } from "@/lib/date";

type Props = {
  onSubmit: (input: {
    title: string;
    dueOn: string | null;
    isPurchase: boolean;
  }) => void;
};

/**
 * 常設Quick Captureバー。タイトルだけで登録が完了する。
 * 「期限」チップをタップすると、今日/明日のワンタップ選択とカレンダーからの
 * 任意選択をまとめたパネルが開く（タグUIは意図的に置かない）。
 */
export function QuickCaptureBar({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState<string | null>(null);
  const [isPurchase, setIsPurchase] = useState(false);
  const [showDuePanel, setShowDuePanel] = useState(false);
  const inputId = useId();

  const today = todayInJst();
  const tomorrow = addDaysToDateString(today, 1);
  const dueLabel =
    dueOn === today ? "今日" : dueOn === tomorrow ? "明日" : (dueOn ?? "期限");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({ title: trimmed, dueOn, isPurchase });
    setTitle("");
    setDueOn(null);
    setIsPurchase(false);
    setShowDuePanel(false);
  }

  function selectDue(value: string | null) {
    setDueOn(value);
    setShowDuePanel(false);
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={3}
      square
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: "calc(56px + env(safe-area-inset-bottom))",
        borderTop: 1,
        borderColor: "divider",
        px: 2,
        pt: 1,
        pb: 1,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ mx: "auto", maxWidth: "36rem", pb: 1 }}
      >
        <Chip
          icon={<CalendarTodayOutlinedIcon />}
          label={dueLabel}
          clickable
          color={dueOn || showDuePanel ? "primary" : "default"}
          variant={dueOn || showDuePanel ? "filled" : "outlined"}
          onClick={() => setShowDuePanel((current) => !current)}
        />
        <Chip
          icon={<ShoppingCartOutlinedIcon />}
          label="買うもの"
          clickable
          color={isPurchase ? "warning" : "default"}
          variant={isPurchase ? "filled" : "outlined"}
          onClick={() => setIsPurchase((current) => !current)}
        />
      </Stack>

      {showDuePanel && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mx: "auto",
            maxWidth: "36rem",
            pb: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button
            size="small"
            variant="outlined"
            onClick={() => selectDue(today)}
          >
            今日
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => selectDue(tomorrow)}
          >
            明日
          </Button>
          <TextField
            type="date"
            size="small"
            value={dueOn ?? ""}
            onChange={(event) => setDueOn(event.target.value || null)}
          />
          {dueOn && (
            <Button
              size="small"
              sx={{ textTransform: "none" }}
              onClick={() => selectDue(null)}
            >
              期限なしにする
            </Button>
          )}
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={1}
        sx={{ mx: "auto", maxWidth: "36rem", pb: 1, alignItems: "center" }}
      >
        <Box
          component="label"
          htmlFor={inputId}
          sx={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
          }}
        >
          やること・買うものを入力
        </Box>
        <TextField
          id={inputId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="やること・買うものを入力"
          size="small"
          fullWidth
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!title.trim()}
          sx={{ flexShrink: 0 }}
        >
          追加
        </Button>
      </Stack>
    </Paper>
  );
}
