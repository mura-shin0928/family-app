"use client";

import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ConsultEntryCard } from "@/features/ai-consult/components/ConsultEntryCard";
import { consultEntryLabel } from "@/features/ai-consult/entry-label";
import { isHttpUrl } from "@/lib/url";
import { LIFE_EVENT_KINDS } from "../catalog";
import type { ItemState } from "../search";
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
  onConsult,
}: {
  item: CatalogItem | null;
  state: ItemState;
  timing: string | null;
  onClose: () => void;
  onAdd: () => void;
  onRecord: () => void;
  /** 渡されたときだけ、AI への相談の入口を出す。 */
  onConsult?: () => void;
}) {
  const kindLabel = LIFE_EVENT_KINDS.find((k) => k.kind === item?.kind)?.label;
  const meta = [kindLabel, timing].filter(Boolean).join(" ・ ");
  const link = item?.link;

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
          spacing={2}
          sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          {/* 上半分: どういうものか分かる */}
          <Stack spacing={1}>
            <Box>
              <Typography variant="h6">{item.title}</Typography>
              {meta !== "" && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {meta}
                </Typography>
              )}
            </Box>
            {item.summary !== "" && (
              <Typography variant="body2">{item.summary}</Typography>
            )}
            {item.note && (
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
              >
                {item.note}
              </Typography>
            )}
            {((item.url && isHttpUrl(item.url)) || link?.notice) && (
              <Box>
                {item.url && isHttpUrl(item.url) && (
                  <MuiLink
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    公式ページ
                    <OpenInNewIcon fontSize="inherit" />
                  </MuiLink>
                )}
                {link?.notice && (
                  <Typography
                    variant="caption"
                    component="p"
                    sx={{ color: "text.secondary" }}
                  >
                    {link.notice}
                  </Typography>
                )}
              </Box>
            )}
            {link && link.relatedUrls.length > 0 && (
              <Stack spacing={0.25}>
                {link.relatedUrls.map((url) => (
                  <MuiLink
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    {linkLabel(url)}
                  </MuiLink>
                ))}
              </Stack>
            )}
          </Stack>

          <Divider />

          {/* 下半分: タスクに追加するか、もうやったと記録する */}
          {state.status === "none" && (
            <Stack spacing={1}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                onClick={onAdd}
              >
                タスクに追加
              </Button>
              {onConsult && (
                <ConsultEntryCard
                  label={consultEntryLabel(item.title)}
                  wrapLabel
                  onOpen={onConsult}
                />
              )}
              <Button
                variant="text"
                onClick={onRecord}
                sx={{ alignSelf: "center", color: "text.secondary" }}
              >
                もうやった
              </Button>
            </Stack>
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
        </Stack>
      )}
    </Drawer>
  );
}

/** 関連リンクには題名が無いので、ホスト名とパスで見せる。 */
function linkLabel(url: string): string {
  const { hostname, pathname } = new URL(url);
  return `${hostname}${pathname === "/" ? "" : pathname}`;
}
