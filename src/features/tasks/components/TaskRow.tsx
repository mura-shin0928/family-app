"use client";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import NotesIcon from "@mui/icons-material/Notes";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Paper from "@mui/material/Paper";
import { keyframes } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import type { PurchaseLocation } from "@/features/purchase-locations/types";
import { dads } from "@/lib/dads";
import { formatDueLabel } from "@/lib/date";
import type { TaskDTO } from "../types";

type Props = {
  task: TaskDTO;
  today: string;
  locations: PurchaseLocation[];
  recordChildName: string | null;
  // 完了にした直後。チェックの演出を出す。
  justCompleted?: boolean;
  onToggle: (task: TaskDTO) => void;
  onOpen: (task: TaskDTO) => void;
};

/** 完了の演出の長さ。この間は行を元の位置に残す。 */
export const COMPLETE_EFFECT_MS = 650;

const pop = keyframes({
  "0%": { transform: "scale(0.6)" },
  "60%": { transform: "scale(1.2)" },
  "100%": { transform: "scale(1)" },
});

const twinkle = keyframes({
  "0%": { transform: "scale(0) rotate(0deg)", opacity: 0 },
  "40%": { transform: "scale(1.1) rotate(20deg)", opacity: 1 },
  "100%": { transform: "scale(0) rotate(45deg)", opacity: 0 },
});

const MOTION_OK = "@media (prefers-reduced-motion: no-preference)";

// チェックボックス（28px 四方）の角からの位置と、またたき始めるまでの遅れ。
const SPARKLES = [
  { size: 12, top: -6, right: -6, delay: 0 },
  { size: 8, bottom: -3, left: -4, delay: 100 },
  { size: 7, top: -4, left: 0, delay: 180 },
] as const;

function Sparkles() {
  return SPARKLES.map(({ size, delay, ...position }) => (
    <Box
      key={delay}
      component="span"
      aria-hidden
      sx={{
        position: "absolute",
        ...position,
        width: size,
        height: size,
        backgroundColor: dads.focusYellow,
        clipPath:
          "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)",
        opacity: 0,
        pointerEvents: "none",
        [MOTION_OK]: {
          animation: `${twinkle} 450ms ease-out ${delay}ms`,
        },
      }}
    />
  ));
}

function MetaItem({
  icon,
  children,
  shrink,
}: {
  icon: ReactNode;
  children: ReactNode;
  shrink?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        minWidth: 0,
        flexShrink: shrink ? 1 : 0,
        color: "text.secondary",
        typography: "body2",
      }}
    >
      {icon}
      <Box
        component="span"
        sx={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** タスクの1行。操作は完了チェックだけで、それ以外のタップで編集シートを開く。 */
export function TaskRow({
  task,
  today,
  locations,
  recordChildName,
  justCompleted = false,
  onToggle,
  onOpen,
}: Props) {
  const done = task.status === "done";
  const celebrating = justCompleted && done;
  const hasDetails = !!(task.url || task.note);
  // 論理削除済みの場所idは「登録済みに無い = 未設定」として扱う。
  const selectedLocation = task.isPurchase
    ? (locations.find((location) => location.id === task.purchaseLocationId) ??
      null)
    : null;
  const hasMeta = !!(task.dueOn || selectedLocation || recordChildName);
  const metaIconSx = { fontSize: 16, flexShrink: 0 };

  return (
    <Paper
      variant="outlined"
      role="button"
      tabIndex={0}
      aria-label={`${task.title}を編集`}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task);
        }
      }}
      sx={{ px: 1, py: 0.5, cursor: "pointer" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ position: "relative", display: "flex" }}>
          <Checkbox
            checked={done}
            onChange={() => onToggle(task)}
            onClick={(event) => event.stopPropagation()}
            size="small"
            aria-label={done ? "未完了に戻す" : "完了にする"}
            // 行の高さを詰めるため既定の padding: 9px を 4px に。
            // メタ行の pl（下記）はこの幅（20 + 8 = 28px）に合わせている。
            sx={{
              p: 0.5,
              ...(celebrating && {
                [MOTION_OK]: { animation: `${pop} 300ms ease-out` },
              }),
            }}
          />
          {celebrating && <Sparkles />}
        </Box>

        <Typography
          variant="body2"
          sx={{
            minWidth: 0,
            flex: 1,
            overflowWrap: "break-word",
            textDecoration: done ? "line-through" : "none",
            color: done ? "text.secondary" : "text.primary",
          }}
        >
          {task.title}
        </Typography>

        {hasDetails && (
          <NotesIcon
            aria-label="URL・メモあり"
            sx={{ fontSize: 16, color: "text.secondary", mr: 0.5 }}
          />
        )}
      </Box>

      {/*
        pl はタイトル左端に合わせる: Checkbox(20 + p:0.5*2 = 28px) ＋ 行の gap(8px) = 36px。
        1行固定にし、はみ出す場所名・子の名前は省略する。
      */}
      {hasMeta && (
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            alignItems: "center",
            pl: "36px",
            pr: 1,
            pb: 0.25,
            overflow: "hidden",
          }}
        >
          {task.dueOn && (
            <MetaItem icon={<CalendarTodayOutlinedIcon sx={metaIconSx} />}>
              {formatDueLabel(task.dueOn, today)}
            </MetaItem>
          )}
          {selectedLocation && (
            <MetaItem icon={<PlaceOutlinedIcon sx={metaIconSx} />} shrink>
              {selectedLocation.name}
            </MetaItem>
          )}
          {recordChildName && (
            <MetaItem
              icon={
                <ChildCareIcon
                  sx={metaIconSx}
                  aria-label="ライフイベントに記録"
                />
              }
              shrink
            >
              {recordChildName}
            </MetaItem>
          )}
        </Box>
      )}
    </Paper>
  );
}
