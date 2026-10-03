"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { DateField } from "@/components/DateField";
import { addDaysToDateString } from "@/lib/date";

/**
 * 期限パネルの中身。カレンダーでの任意選択と今日/明日のワンタップ選択をまとめる。
 * mousedown のフォーカス移動を止めるのは、Quick Capture でタイトル入力中の
 * キーボードを閉じさせないため。
 */
export function DuePanel({
  dueOn,
  today,
  onChange,
  onSelect,
}: {
  dueOn: string | null;
  today: string;
  /** カレンダーでの変更。パネルは開いたまま。 */
  onChange: (dueOn: string | null) => void;
  /** 今日・明日・期限なしの選択。呼び出し側でパネルを閉じる。 */
  onSelect: (dueOn: string | null) => void;
}) {
  const preventBlur = (event: { preventDefault: () => void }) =>
    event.preventDefault();

  return (
    <Stack spacing={1} sx={{ p: 1.5 }}>
      <DateField
        size="small"
        fullWidth
        value={dueOn ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      />
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          fullWidth
          onMouseDown={preventBlur}
          onClick={() => onSelect(today)}
        >
          今日
        </Button>
        <Button
          size="small"
          variant="outlined"
          fullWidth
          onMouseDown={preventBlur}
          onClick={() => onSelect(addDaysToDateString(today, 1))}
        >
          明日
        </Button>
      </Stack>
      {dueOn && (
        <Button
          size="small"
          fullWidth
          onMouseDown={preventBlur}
          onClick={() => onSelect(null)}
        >
          期限なしにする
        </Button>
      )}
    </Stack>
  );
}
