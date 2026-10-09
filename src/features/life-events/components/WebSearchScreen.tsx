"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { hostnameOf } from "@/lib/url";
import { searchWebCatalog } from "../item-actions";
import { type ItemState, isPublicSectorHost } from "../search";
import { formatSlashDate } from "../timing";
import type { CatalogItem } from "../types";

const TITLE_ID = "web-search-screen-title";

/** Web の検索結果を全画面で出す。query が null の間は閉じている。 */
export function WebSearchScreen({
  childId,
  query,
  stateFor,
  onOpenItem,
  onClose,
}: {
  childId: string;
  query: string | null;
  stateFor: (item: CatalogItem) => ItemState;
  onOpenItem: (item: CatalogItem) => void;
  onClose: () => void;
}) {
  const open = query !== null;

  // 端末の「戻る」で閉じられるよう、開いている間だけ履歴を1つ積む。
  const pushed = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (!pushed.current) {
      window.history.pushState(null, "");
      pushed.current = true;
    }
    function handlePopState() {
      pushed.current = false;
      onClose();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open, onClose]);

  function requestClose() {
    window.history.back();
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={requestClose}
      aria-labelledby={TITLE_ID}
      // 面をふつうの画面と同じ背景にする（ダイアログの面はダークで明るく浮く）
      slotProps={{
        paper: {
          sx: { bgcolor: "background.default", backgroundImage: "none" },
        },
      }}
    >
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            size="small"
            sx={{ mr: 1 }}
            aria-label="戻る"
            onClick={requestClose}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography id={TITLE_ID} variant="h6" component="h2">
            Web の検索結果
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          px: 2,
          pt: 1,
          pb: "calc(16px + env(safe-area-inset-bottom))",
          overflowY: "auto",
        }}
      >
        {query !== null && (
          <WebSearchResults
            childId={childId}
            query={query}
            stateFor={stateFor}
            onOpenItem={onOpenItem}
          />
        )}
      </Box>
    </Dialog>
  );
}

function WebSearchResults({
  childId,
  query,
  stateFor,
  onOpenItem,
}: {
  childId: string;
  query: string;
  stateFor: (item: CatalogItem) => ItemState;
  onOpenItem: (item: CatalogItem) => void;
}) {
  // 検索語ごとに結果を持ち、同じ語で開き直したら引き直さない。
  const web = useQuery({
    queryKey: ["life-event-web-search", childId, query],
    queryFn: () => searchWebCatalog({ childId, query }),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const { data } = web;

  if (web.isFetching) {
    return <WebSearchLoading />;
  }
  if (!data || (!data.ok && data.reason !== "quota_exceeded")) {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Web 検索に失敗しました
        </Typography>
        <Button size="small" onClick={() => web.refetch()} sx={{ mt: 0.5 }}>
          もう一度試す
        </Button>
      </Box>
    );
  }
  if (!data.ok) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
        今日の Web 検索の回数を使い切りました。明日また試してください
      </Typography>
    );
  }
  if (data.items.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
        「{data.searchedQuery}」は Web でも見つかりませんでした
      </Typography>
    );
  }
  return (
    <>
      <Typography
        variant="caption"
        component="p"
        sx={{
          color: "text.secondary",
          mt: 1,
          mb: 0.5,
          px: 1.5,
          py: 1,
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      >
        {`「${data.searchedQuery}」の検索結果です。公式の情報かどうかは、ページを開いて確かめてください。`}
      </Typography>
      {data.items.map((item) => (
        <WebResultRow
          key={item.key}
          item={item}
          state={stateFor(item)}
          onOpen={() => onOpenItem(item)}
        />
      ))}
    </>
  );
}

/** 行そのものは押せない。操作は右端の「＋」（詳細シートを開く）に揃える。 */
function WebResultRow({
  item,
  state,
  onOpen,
}: {
  item: CatalogItem;
  state: ItemState;
  onOpen: () => void;
}) {
  const host = item.url ? hostnameOf(item.url) : null;

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
        {host && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0.75,
              my: 0.25,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", overflowWrap: "anywhere" }}
            >
              {host}
            </Typography>
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
        {item.summary !== "" && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.summary}
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

/** 検索中の表示。結果の行（タイトル＋ホスト名＋抜粋）に近い高さの骨組みを並べる。 */
function WebSearchLoading() {
  return (
    <Box role="status" aria-live="polite">
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 1,
        }}
      >
        <CircularProgress size={16} />
        Web を検索しています…
      </Typography>
      {[70, 55, 80].map((width) => (
        <Box
          key={width}
          aria-hidden
          sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
        >
          <Skeleton variant="text" width={`${width}%`} />
          <Skeleton variant="text" width="40%" sx={{ fontSize: "0.75rem" }} />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="85%" />
        </Box>
      ))}
    </Box>
  );
}
