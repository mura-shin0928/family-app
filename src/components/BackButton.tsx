"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
import { useRouter } from "next/navigation";

/**
 * ブラウザ履歴を1つ戻る。履歴が無い（直接URLを開いた等）場合だけ
 * fallbackHref に遷移する。
 */
export function BackButton({
  fallbackHref = "/tasks",
}: {
  fallbackHref?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <IconButton
      edge="start"
      size="small"
      sx={{ mr: 1 }}
      aria-label="戻る"
      onClick={handleClick}
    >
      <ArrowBackIcon fontSize="small" />
    </IconButton>
  );
}
