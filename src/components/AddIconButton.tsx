"use client";

import AddIcon from "@mui/icons-material/Add";
import IconButton from "@mui/material/IconButton";

/**
 * 見出し横の「追加」。文字なしでも押せると分かるよう枠を付け、レシピ一覧の＋（Fab）と同じ円形にする。
 * size="small" の IconButton なので当たり判定は 44px 角に広がる（theme）。
 */
export function AddIconButton({
  "aria-label": ariaLabel,
  onClick,
}: {
  "aria-label": string;
  onClick: () => void;
}) {
  return (
    <IconButton
      size="small"
      color="primary"
      aria-label={ariaLabel}
      onClick={onClick}
      sx={{
        border: "1px solid currentColor",
        borderRadius: "50%",
        bgcolor: "background.paper",
        p: "3px",
        "&:hover": {
          bgcolor: "var(--mui-palette-brand-outlinedHoverBg)",
          color: "var(--mui-palette-brand-onTintHover)",
        },
        "&:active": {
          bgcolor: "var(--mui-palette-brand-outlinedActiveBg)",
          color: "var(--mui-palette-brand-onTintActive)",
        },
      }}
    >
      <AddIcon fontSize="small" />
    </IconButton>
  );
}
