"use client";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import NotesIcon from "@mui/icons-material/Notes";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import type { PurchaseLocation } from "@/features/purchase-locations/types";
import { formatRelativeDue } from "@/lib/date";
import type { TaskDTO } from "../types";

type Props = {
  task: TaskDTO;
  today: string;
  locations: PurchaseLocation[];
  recordChildName: string | null;
  onToggle: (task: TaskDTO) => void;
  onOpen: (task: TaskDTO) => void;
};

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
  onToggle,
  onOpen,
}: Props) {
  const done = task.status === "done";
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
        <Checkbox
          checked={done}
          onChange={() => onToggle(task)}
          onClick={(event) => event.stopPropagation()}
          size="small"
          aria-label={done ? "未完了に戻す" : "完了にする"}
          // 行の高さを詰めるため既定の padding: 9px を 4px に。
          // メタ行の pl（下記）はこの幅（20 + 8 = 28px）に合わせている。
          sx={{ p: 0.5 }}
        />

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
              {formatRelativeDue(task.dueOn, today)}
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
