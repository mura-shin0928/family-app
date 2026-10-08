"use client";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { hostnameOf } from "@/lib/url";
import { type ItemState, isWebCatalogKey } from "../search";
import { formatSlashDate } from "../timing";
import type { CatalogItem } from "../types";

/** 行そのものは押せない。操作は右端の「＋」（詳細シートを開く）に揃える。 */
export function CatalogItemRow({
  item,
  state,
  timing,
  onOpen,
}: {
  item: CatalogItem;
  state: ItemState;
  /** describeTiming の結果。出せなければ null */
  timing: string | null;
  onOpen: () => void;
}) {
  // Web の結果は抜粋の代わりに、どこのページかを出す（抜粋は詳細シートで出す）
  const host =
    isWebCatalogKey(item.key) && item.url ? hostnameOf(item.url) : null;
  const summary = isWebCatalogKey(item.key) ? "" : item.summary;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderBottom: 1,
        borderColor: "divider",
        opacity: state.status === "done" ? 0.5 : 1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, py: 1.5 }}>
        <Typography variant="body1">{item.title}</Typography>
        {summary !== "" && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {summary}
          </Typography>
        )}
        {host && (
          <Typography
            variant="caption"
            component="p"
            sx={{ color: "text.secondary", overflowWrap: "anywhere" }}
          >
            {host}
          </Typography>
        )}
        {timing && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {timing}
          </Typography>
        )}
        {state.status === "done" && (
          <Typography
            variant="caption"
            component="p"
            sx={{ color: "text.secondary" }}
          >
            {formatSlashDate(state.doneOn).slice(5)} 記録済み
          </Typography>
        )}
      </Box>
      {state.status === "in_task" && (
        <Chip label="タスク追加済み" size="small" />
      )}
      {state.status === "none" && (
        <IconButton aria-label={`${item.title}を開く`} onClick={onOpen}>
          <AddIcon />
        </IconButton>
      )}
    </Box>
  );
}
