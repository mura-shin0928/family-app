"use client";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
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
 * タイトル入力中に他のコントロールをタップすると、そちらへフォーカスが移って
 * ソフトウェアキーボードが閉じてしまう（＝フォームが閉じたように見える）。
 * mousedown 側でデフォルト動作（フォーカス移動）を止めることで、
 * クリック自体は通しつつ入力中のフォーカス/キーボードを保つ。
 */
function preventBlur(event: { preventDefault: () => void }) {
  event.preventDefault();
}

/**
 * 常設Quick Captureバー。タイトルだけで登録が完了する。
 * 「期限」チップをタップすると、今日/明日のワンタップ選択とカレンダーからの
 * 任意選択をまとめたパネルが開く（タグUIは意図的に置かない）。
 */
export function QuickCaptureBar({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState<string | null>(null);
  const [isPurchase, setIsPurchase] = useState(false);
  const [dueAnchorEl, setDueAnchorEl] = useState<HTMLElement | null>(null);
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
    setDueAnchorEl(null);
  }

  function selectDue(value: string | null) {
    setDueOn(value);
    setDueAnchorEl(null);
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
        // Checkbox内部のネイティブinputがz-index:1を持つため、指定しないと
        // タスク行と重なった際にそちらへクリックが先取りされてしまう。
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: 1,
        borderColor: "divider",
        px: 2,
        pt: 1,
        pb: 1,
      }}
    >
      <Box
        sx={{
          mx: "auto",
          maxWidth: "36rem",
          pb: 1,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          columnGap: 1,
          rowGap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          id={inputId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="やること・買うものを入力"
          size="small"
          fullWidth
          slotProps={{
            htmlInput: { "aria-label": "やること・買うものを入力" },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!title.trim()}
          sx={{ flexShrink: 0 }}
        >
          追加
        </Button>

        {/* TextFieldと同じグリッド列に入れて、その列内で右揃えにする */}
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
          <Chip
            icon={<CalendarTodayOutlinedIcon sx={{ width: 16, height: 16 }} />}
            label={dueLabel}
            clickable
            color={dueOn || dueAnchorEl ? "primary" : "default"}
            variant={dueOn || dueAnchorEl ? "filled" : "outlined"}
            onMouseDown={preventBlur}
            onClick={(event) =>
              setDueAnchorEl((current) =>
                current ? null : event.currentTarget,
              )
            }
          />
          <Chip
            icon={<ShoppingCartOutlinedIcon sx={{ width: 16, height: 16 }} />}
            label="買うもの"
            clickable
            color={isPurchase ? "primary" : "default"}
            variant={isPurchase ? "filled" : "outlined"}
            onMouseDown={preventBlur}
            onClick={() => setIsPurchase((current) => !current)}
          />
        </Stack>
      </Box>

      <Popover
        open={Boolean(dueAnchorEl)}
        anchorEl={dueAnchorEl}
        onClose={() => setDueAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Stack spacing={1} sx={{ p: 1.5, width: "16rem" }}>
          <TextField
            type="date"
            size="small"
            fullWidth
            value={dueOn ?? ""}
            onChange={(event) => setDueOn(event.target.value || null)}
          />
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onMouseDown={preventBlur}
              onClick={() => selectDue(today)}
            >
              今日
            </Button>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onMouseDown={preventBlur}
              onClick={() => selectDue(tomorrow)}
            >
              明日
            </Button>
          </Stack>
          {dueOn && (
            <Button
              size="small"
              fullWidth
              sx={{ textTransform: "none" }}
              onMouseDown={preventBlur}
              onClick={() => selectDue(null)}
            >
              期限なしにする
            </Button>
          )}
        </Stack>
      </Popover>
    </Paper>
  );
}
