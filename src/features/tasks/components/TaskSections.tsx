"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { type ReactNode, useRef, useState } from "react";

const COMPLETED_TASK_HINT =
  "完了したタスクは翌日になると一覧から自動的に非表示になります（削除はされません）";

export function BucketSection({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Box component="section">
      <Typography variant="subtitle2" sx={{ color: "primary.dark", mb: 1 }}>
        {label}（{count}）
      </Typography>
      <Stack spacing={1}>{children}</Stack>
    </Box>
  );
}

/**
 * BucketSection と同じ見た目（Paper/カード枠なし）の折りたたみ見出し。
 * MUIのAccordionはPaper+角丸+線を持つため、通常の見出しと並べると
 * それだけ「かさばって」見える — Collapseで組み直し、視覚的な重さを揃える。
 */
function CollapsibleHeader({
  title,
  expanded,
  onToggle,
  extra,
}: {
  title: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  extra?: ReactNode;
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        cursor: "pointer",
        mb: 1,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: "primary.dark" }}>
        {title}
      </Typography>
      {extra}
      <ExpandMoreIcon
        fontSize="small"
        sx={{
          color: "text.secondary",
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.15s",
        }}
      />
    </Box>
  );
}

export function CollapsibleSection({
  label,
  count,
  defaultExpanded,
  children,
}: {
  label: string;
  count: number;
  defaultExpanded: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <Box component="section">
      <CollapsibleHeader
        title={`${label}（${count}）`}
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
      />
      <Collapse in={expanded}>
        <Stack spacing={1}>{children}</Stack>
      </Collapse>
    </Box>
  );
}

export function CompletedSection({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleHint() {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintOpen((current) => {
      const next = !current;
      if (next) {
        hintTimer.current = setTimeout(() => setHintOpen(false), 4000);
      }
      return next;
    });
  }

  return (
    <Box component="section">
      <CollapsibleHeader
        title={`完了（今日 ${count}）`}
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        extra={
          // MUIのTooltipはhover前提のためタッチ操作では長押し(既定約0.7秒)が
          // 必要になり、単純なタップだと開かないことがある。ここではタップの
          // クリックイベントだけで開閉を制御し、自動でも4秒後に閉じる。
          <Tooltip
            title={COMPLETED_TASK_HINT}
            open={hintOpen}
            onClose={() => setHintOpen(false)}
            disableFocusListener
            disableHoverListener
            disableTouchListener
          >
            <InfoOutlinedIcon
              fontSize="inherit"
              tabIndex={0}
              titleAccess={COMPLETED_TASK_HINT}
              onClick={(event) => {
                event.stopPropagation();
                toggleHint();
              }}
              sx={{ color: "text.secondary", cursor: "help" }}
            />
          </Tooltip>
        }
      />
      <Collapse in={expanded}>
        <Stack spacing={1}>{children}</Stack>
      </Collapse>
    </Box>
  );
}
