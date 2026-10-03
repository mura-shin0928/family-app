"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Mascot } from "@/components/Mascot";
import type { TodayProgress } from "../buckets";
import { type MascotLine, mascotLineAt, pickRareLine } from "../mascot-lines";

/**
 * おうちくんのひとこと。タップするたびにセリフと表情が変わる。
 * 一覧が空のとき（large）は中央に大きく、それ以外は吹き出しつきで横に並べる。
 * progress が変わったらあいさつに戻したいので、呼び出し側で key に progress を渡す。
 */
export function MascotSpeech({
  progress,
  large = false,
}: {
  progress: TodayProgress;
  large?: boolean;
}) {
  const [tapCount, setTapCount] = useState(0);
  const [rareLine, setRareLine] = useState<MascotLine | null>(null);
  const { expression, lines } = rareLine ?? mascotLineAt(progress, tapCount);

  function handleTap() {
    const rare = pickRareLine(Math.random);
    setRareLine(rare);
    if (!rare) setTapCount((count) => count + 1);
  }

  const mascotButton = (
    <ButtonBase
      aria-label="おうちくんに話しかける"
      onClick={handleTap}
      sx={{ borderRadius: "16px", flexShrink: 0 }}
    >
      <Mascot expression={expression} size={large ? undefined : 56} />
    </ButtonBase>
  );

  if (large) {
    return (
      <EmptyState
        illustration={mascotButton}
        py={progress === "allDone" ? 3 : 8}
      >
        <span aria-live="polite">
          {lines.map((line) => (
            // 幅が足りないときは行の切れ目で折り返す
            <Box key={line} component="span" sx={{ display: "inline-block" }}>
              {line}
            </Box>
          ))}
        </span>
      </EmptyState>
    );
  }

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      {mascotButton}
      <Box
        sx={{
          position: "relative",
          px: 2,
          py: 1,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: "16px",
          "&::before": {
            content: '""',
            position: "absolute",
            left: -6,
            top: "50%",
            width: 10,
            height: 10,
            bgcolor: "background.paper",
            borderLeft: 1,
            borderBottom: 1,
            borderColor: "divider",
            transform: "translateY(-50%) rotate(45deg)",
          },
        }}
      >
        <Typography
          variant="body1"
          aria-live="polite"
          sx={(theme) => ({
            // 1行のセリフでも2行ぶんの高さを保ち、タップで帯の高さが変わらないようにする。
            minHeight: `calc(${theme.typography.body1.fontSize} * ${theme.typography.body1.lineHeight} * 2)`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          })}
        >
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </Typography>
      </Box>
    </Stack>
  );
}
