"use client";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { hostnameOf, isHttpUrl } from "@/lib/url";
import { LIFE_EVENT_KINDS } from "../catalog";
import { type ItemState, isWebCatalogKey } from "../search";
import { formatSlashDate } from "../timing";
import type { CatalogItem } from "../types";

/** 項目の詳細を下から出すシート。item が null の間は閉じている。 */
export function CatalogItemSheet({
  item,
  state,
  timing,
  onClose,
  onAdd,
  onRecord,
}: {
  item: CatalogItem | null;
  state: ItemState;
  timing: string | null;
  onClose: () => void;
  onAdd: () => void;
  onRecord: () => void;
}) {
  const kindLabel = LIFE_EVENT_KINDS.find((k) => k.kind === item?.kind)?.label;
  const isWeb = item !== null && isWebCatalogKey(item.key);
  const host = isWeb && item.url ? hostnameOf(item.url) : null;
  const meta = [kindLabel, timing].filter(Boolean).join(" ・ ");

  return (
    <Drawer
      anchor="bottom"
      open={item !== null}
      onClose={onClose}
      slotProps={{
        paper: { sx: { borderRadius: "16px 16px 0 0", maxHeight: "85dvh" } },
      }}
    >
      {item && (
        <Stack
          spacing={1.5}
          sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          <Typography variant="h6">{item.title}</Typography>
          {host && (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", overflowWrap: "anywhere" }}
            >
              {host}
            </Typography>
          )}
          {item.summary !== "" && (
            <Typography variant="body2">{item.summary}</Typography>
          )}
          {isWeb && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Web 検索の抜粋です。内容はページで確かめてください。
            </Typography>
          )}
          {meta !== "" && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {meta}
            </Typography>
          )}
          {item.note && (
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {item.note}
            </Typography>
          )}
          {item.url && isHttpUrl(item.url) && (
            <MuiLink
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
            >
              {isWeb ? "ページを開く" : "公式ページを開く"}
            </MuiLink>
          )}
          {state.status === "in_task" && (
            <Box>
              <Chip label="タスク追加済み" size="small" />
            </Box>
          )}
          {state.status === "done" && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {formatSlashDate(state.doneOn).slice(5)} 記録済み
            </Typography>
          )}
          {state.status === "none" && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAdd}
              >
                タスクに追加
              </Button>
              <Button variant="outlined" onClick={onRecord}>
                もうやった
              </Button>
            </Stack>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
