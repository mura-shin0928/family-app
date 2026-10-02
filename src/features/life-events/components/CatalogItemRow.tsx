"use client";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { ItemState } from "../search";
import { formatSlashDate } from "../timing";
import type { CatalogItem } from "../types";

export function CatalogItemRow({
  item,
  state,
  timing,
  onOpen,
  onAdd,
}: {
  item: CatalogItem;
  state: ItemState;
  /** describeTiming の結果。出せなければ null */
  timing: string | null;
  onOpen: () => void;
  onAdd: () => void;
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
      <Box
        component="button"
        type="button"
        onClick={onOpen}
        sx={{
          flex: 1,
          minWidth: 0,
          py: 1.5,
          textAlign: "left",
          font: "inherit",
          color: "inherit",
          background: "none",
          border: 0,
          cursor: "pointer",
        }}
      >
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
      {state.status === "in_task" && <Chip label="タスクにある" size="small" />}
      {state.status === "none" && (
        <IconButton
          aria-label={`${item.title}をやることに追加`}
          onClick={onAdd}
        >
          <AddIcon />
        </IconButton>
      )}
    </Box>
  );
}
