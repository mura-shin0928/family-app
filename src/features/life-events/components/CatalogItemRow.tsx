"use client";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { ItemState } from "../search";
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
        {item.summary !== "" && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {item.summary}
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
