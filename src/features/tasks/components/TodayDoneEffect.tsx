"use client";

import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import { type CSSProperties, useState } from "react";
import { dads } from "@/lib/dads";

const PIECES_PER_SIDE = 26;
const DURATION_MS = 1800;
const COLORS = [
  "primary.main",
  dads.focusYellow,
  dads.green300,
  dads.orange300,
  dads.magenta300,
] as const;
// 紙片・丸・細いリボン
const SHAPES = [
  { width: 8, height: 12, borderRadius: "2px" },
  { width: 9, height: 9, borderRadius: "50%" },
  { width: 4, height: 16, borderRadius: "2px" },
] as const;

// 横は勢いよく飛び出して失速する。
const fly = keyframes({
  "0%": { transform: "translateX(0)" },
  "100%": { transform: "translateX(var(--dx))" },
});

// 縦は頂点まで打ち上がってから落ちる。
const arc = keyframes({
  "0%": {
    transform: "translateY(0) rotate(0deg)",
    opacity: 1,
    animationTimingFunction: "cubic-bezier(0.2, 0.8, 0.3, 1)",
  },
  "45%": {
    transform: "translateY(var(--peak)) rotate(calc(var(--spin) * 0.5))",
    opacity: 1,
    animationTimingFunction: "ease-in",
  },
  "85%": { opacity: 1 },
  "100%": {
    transform: "translateY(calc(var(--peak) + 45vh)) rotate(var(--spin))",
    opacity: 0,
  },
});

const random = (min: number, max: number) =>
  Math.round(min + Math.random() * (max - min));

function makePieces() {
  return (["left", "right"] as const).flatMap((side) =>
    Array.from({ length: PIECES_PER_SIDE }, (_, index) => ({
      id: `${side}-${index}`,
      side,
      delay: random(0, 150),
      color: COLORS[index % COLORS.length],
      shape: SHAPES[index % SHAPES.length],
      vars: {
        "--dx": `${(side === "left" ? 1 : -1) * random(8, 85)}vw`,
        "--peak": `-${random(35, 88)}vh`,
        "--spin": `${random(360, 900)}deg`,
      } as CSSProperties,
    })),
  );
}

/**
 * 今日のぶんが片付いたときのクラッカー。画面下の両端から紙吹雪が打ち上がり、操作は妨げない。
 * もう一度鳴らすときは、呼び出し側で key を変えて作り直す。
 */
export function TodayDoneEffect() {
  const [pieces] = useState(makePieces);

  return (
    <Box
      aria-hidden
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: "snackbar",
      }}
    >
      {pieces.map((piece) => (
        <Box
          key={piece.id}
          component="span"
          style={piece.vars}
          sx={{
            position: "absolute",
            bottom: 0,
            [piece.side]: 0,
            animation: `${fly} ${DURATION_MS}ms cubic-bezier(0.1, 0.7, 0.3, 1) ${piece.delay}ms both`,
          }}
        >
          <Box
            component="span"
            sx={{
              display: "block",
              ...piece.shape,
              backgroundColor: piece.color,
              opacity: 0,
              animation: `${arc} ${DURATION_MS}ms linear ${piece.delay}ms both`,
            }}
          />
        </Box>
      ))}
    </Box>
  );
}
