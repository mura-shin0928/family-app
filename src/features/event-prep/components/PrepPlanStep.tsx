"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  type ChildDates,
  describeTiming,
  isPublicSectorHost,
} from "@/features/life-events/search";
import { hostnameOf } from "@/lib/url";
import type { PrepItem } from "../types";

export type PlannedItem = PrepItem & { id: string };

/** 提案の一覧。要らないものを外して、選んだ分をタスクにする。 */
export function PrepPlanStep({
  items,
  child,
  selected,
  onToggle,
  onAdd,
  adding,
  error,
}: {
  items: PlannedItem[];
  child: ChildDates;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onAdd: () => void;
  adding: boolean;
  error: string | null;
}) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
        提案が見つかりませんでした
      </Typography>
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
  const host = item.sourceUrl ? hostnameOf(item.sourceUrl) : null;
  const labelId = `prep-item-${item.id}`;

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
        {item.sourceUrl && host && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0.75,
              mt: 0.25,
            }}
          >
            <MuiLink
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              sx={{ overflowWrap: "anywhere" }}
            >
              {host}
            </MuiLink>
            {isPublicSectorHost(host) && (
              <Chip
                label="公的"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
