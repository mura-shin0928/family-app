"use client";

import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import InputAdornment from "@mui/material/InputAdornment";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import type { MouseEvent } from "react";

/** アイコンのタップでもピッカーを開く（iOS ではアイコンが input の外にある）。 */
function openPicker(event: MouseEvent<HTMLElement>) {
  const input = event.currentTarget.parentElement?.querySelector("input");
  if (!input) return;
  input.focus();
  try {
    input.showPicker();
  } catch {
    // showPicker 非対応の環境はフォーカスだけでよい
  }
}

/**
 * 日付の入力欄。iOS Safari はネイティブのカレンダーアイコンを出さないので、
 * どの環境でも右端にアイコンを置く（PC では theme.ts の指定で欄全体がピッカーを開く）。
 */
export function DateField({ slotProps, ...props }: TextFieldProps) {
  return (
    <TextField
      {...props}
      type="date"
      slotProps={{
        ...slotProps,
        input: {
          endAdornment: (
            <InputAdornment
              position="end"
              onClick={openPicker}
              sx={{ cursor: "pointer" }}
            >
              <CalendarMonthOutlined fontSize="small" />
            </InputAdornment>
          ),
          ...slotProps?.input,
        },
      }}
    />
  );
}
