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
}: {
  items: PlannedItem[];
  searchSuggestions: string | null;
  child: ChildDates;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onAdd: () => void;
  adding: boolean;
  error: string | null;
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
      {suggestions}
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        variant="contained"
        disabled={selected.size === 0 || adding}
        onClick={onAdd}
      >
        選んだ{selected.size}件をタスクに追加
      </Button>
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
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0.5,
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
