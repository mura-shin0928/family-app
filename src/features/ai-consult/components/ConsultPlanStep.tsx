"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { type ChildDates, describeTiming } from "@/features/life-events/search";
import type { ConsultItem } from "../types";
import { SearchSuggestions } from "./SearchSuggestions";

export type PlannedItem = ConsultItem & { id: string };

/** 提案の一覧。要らないものを外して、選んだ分をタスクにする。 */
export function ConsultPlanStep({
  items,
  searchSuggestions,
  child,
  selected,
  onToggle,
  onAdd,
  adding,
  error,
  onRetry,
}: {
  items: PlannedItem[];
  searchSuggestions: string | null;
  child: ChildDates;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onAdd: () => void;
  adding: boolean;
  error: string | null;
  /** 質問の答えを残したまま、質問の画面に戻る。 */
  onRetry: () => void;
}) {
  const suggestions = searchSuggestions && (
    <SearchSuggestions html={searchSuggestions} />
  );

  if (items.length === 0) {
    return (
      <Stack spacing={1.5} sx={{ py: 2 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          提案が見つかりませんでした
        </Typography>
        <Box>
          <Button size="small" onClick={onRetry}>
            質問からやり直す
          </Button>
        </Box>
        {suggestions}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ py: 1 }}>
      <Typography
        variant="caption"
        component="p"
        sx={{
          color: "text.secondary",
          px: 1.5,
          py: 1,
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      >
        AI の提案です。時期や内容は、公式のページやお店で確かめてください。
      </Typography>
      <Box>
        {items.map((item) => (
          <PlanRow
            key={item.id}
            item={item}
            timing={describeTiming(item, child)}
            checked={selected.has(item.id)}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </Box>
      {/* 件数が多くてもボタンが見えるよう、画面の下に留める */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: 1,
          bgcolor: "background.default",
          py: 1,
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          disabled={selected.size === 0 || adding}
          onClick={onAdd}
        >
          選んだ{selected.size}件をタスクに追加
        </Button>
      </Box>
      {/* 規約で一緒に表示する。目立たないよう一番下に置く */}
      {suggestions}
    </Stack>
  );
}

function PlanRow({
  item,
  timing,
  checked,
  onToggle,
}: {
  item: PlannedItem;
  timing: string | null;
  checked: boolean;
  onToggle: () => void;
}) {
  const labelId = `consult-item-${item.id}`;

  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0.5,
        cursor: "pointer",
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Checkbox
        checked={checked}
        onChange={onToggle}
        slotProps={{ input: { "aria-labelledby": labelId } }}
      />
      <Box sx={{ flex: 1, minWidth: 0, pt: 1 }}>
        <Typography id={labelId} variant="body1">
          {item.title}
        </Typography>
        {timing && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {timing}
          </Typography>
        )}
        {item.reason !== "" && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {item.reason}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
