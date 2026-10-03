"use client";

import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { Child } from "@/features/children/types";
import { todayInJst } from "@/lib/date";
import { LIFE_EVENT_CATALOG, LIFE_EVENT_KINDS } from "../catalog";
import { fetchAreaCatalog } from "../item-actions";
import {
  describeChildStage,
  describeTiming,
  itemStateFor,
  matchesQuery,
  resolveTargetDate,
  selectCurrentItems,
  WINDOW_DAYS_AFTER,
  WINDOW_DAYS_BEFORE,
} from "../search";
import type { CatalogItem, LifeEventItem, LifeEventKind } from "../types";
import { CatalogItemRow } from "./CatalogItemRow";
import { CatalogItemSheet } from "./CatalogItemSheet";

type FilterChip = "current" | LifeEventKind;

export function SearchTab({
  child,
  items,
  showPrograms,
  onAddToTask,
  onRecordDone,
}: {
  child: Child;
  items: LifeEventItem[];
  showPrograms: boolean;
  onAddToTask: (item: CatalogItem, presetDueOn: string) => void;
  onRecordDone: (item: CatalogItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<FilterChip>("current");
  const [sheetItem, setSheetItem] = useState<CatalogItem | null>(null);

  const dates = {
    birthDate: child.birthDate,
    expectedBirthDate: child.expectedBirthDate,
  };
  const searching = query.trim() !== "";
  const today = todayInJst();
  const stage = describeChildStage(dates, today);

  const catalogList = searching
    ? LIFE_EVENT_CATALOG.filter((item) => matchesQuery(item, query))
    : chip === "current"
      ? selectCurrentItems(LIFE_EVENT_CATALOG, dates, today)
      : LIFE_EVENT_CATALOG.filter((item) => item.kind === chip);

  const area = useQuery({
    queryKey: ["life-event-programs", child.id],
    queryFn: () => fetchAreaCatalog({ childId: child.id }),
    enabled: showPrograms,
    staleTime: 5 * 60 * 1000,
  });
  const areaData = area.data;
  const programList =
    areaData?.ok === true
      ? areaData.items.filter((item) =>
          searching
            ? matchesQuery(item, query)
            : chip === "current" || item.kind === chip,
        )
      : [];

  // 検索中は制度の結果が出るまで「見つかりませんでした」を出さない。
  const programsPending =
    searching && ((showPrograms && area.isPending) || programList.length > 0);

  function renderRow(item: CatalogItem) {
    const state = itemStateFor(item.key, child.id, items);
    return (
      <CatalogItemRow
        key={item.key}
        item={item}
        state={state}
        timing={describeTiming(item, dates)}
        onOpen={() => setSheetItem(item)}
      />
    );
  }

  const sheetState = sheetItem
    ? itemStateFor(sheetItem.key, child.id, items)
    : ({ status: "none" } as const);

  return (
    <Stack spacing={2}>
      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="例: 出生届、児童手当"
        size="small"
        fullWidth
        slotProps={{
          htmlInput: {
            style: { fontSize: "1rem" },
            "aria-label": "ライフイベントの項目を検索",
          },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5 }}>
        <Chip
          label="いまの時期"
          color={chip === "current" ? "primary" : "default"}
          onClick={() => setChip("current")}
        />
        {LIFE_EVENT_KINDS.map(({ kind, label }) => (
          <Chip
            key={kind}
            label={label}
            color={chip === kind ? "primary" : "default"}
            onClick={() => setChip(kind)}
          />
        ))}
      </Box>

      {showPrograms && (
        <ProgramSection
          // チップや検索語が変わったら「もっと見る」を閉じた状態に戻す
          key={searching ? `query:${query}` : chip}
          loading={area.isPending}
          data={areaData}
          list={programList}
          listHidden={!searching && chip === "current"}
          renderRow={renderRow}
        />
      )}

      <Box>
        <SectionHeading icon={<MenuBookOutlinedIcon fontSize="small" />}>
          一般的な手続き・行事
        </SectionHeading>
        {!searching && chip === "current" && stage && (
          <Typography
            variant="caption"
            component="p"
            sx={{
              color: "text.secondary",
              mt: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 0.25,
            }}
          >
            いまの時期 ─ {stage}
            <Tooltip
              title={`目安日が今日の${WINDOW_DAYS_BEFORE}日前〜${WINDOW_DAYS_AFTER}日後の項目`}
              enterTouchDelay={0}
              leaveTouchDelay={3000}
            >
              <IconButton size="small" aria-label="いまの時期の範囲">
                <InfoOutlinedIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
            </Tooltip>
          </Typography>
        )}
        {catalogList.map(renderRow)}
        {catalogList.length === 0 && !programsPending && (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
            {searching
              ? "見つかりませんでした"
              : chip === "current"
                ? "いまの時期に当たる項目はありません。イベントのチップから探してください"
                : "項目がありません"}
          </Typography>
        )}
      </Box>

      <CatalogItemSheet
        item={sheetItem}
        state={sheetState}
        timing={sheetItem ? describeTiming(sheetItem, dates) : null}
        onClose={() => setSheetItem(null)}
        onAdd={() => {
          if (!sheetItem) return;
          onAddToTask(sheetItem, resolveTargetDate(sheetItem, dates) ?? "");
          setSheetItem(null);
        }}
        onRecord={() => {
          if (!sheetItem) return;
          onRecordDone(sheetItem);
          setSheetItem(null);
        }}
      />
    </Stack>
  );
}

/** 一覧の区分の見出し。テンプレ側と制度側で同じ強さにする。 */
function SectionHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Typography
      variant="subtitle1"
      component="h2"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        fontWeight: 700,
        pb: 0.5,
        borderBottom: 2,
        borderColor: "divider",
      }}
    >
      {icon}
      {children}
    </Typography>
  );
}

/** 最初に出す制度の件数。 */
const COLLAPSED_PROGRAM_COUNT = 5;

function ProgramSection({
  loading,
  data,
  list,
  listHidden,
  renderRow,
}: {
  loading: boolean;
  data: Awaited<ReturnType<typeof fetchAreaCatalog>> | undefined;
  list: CatalogItem[];
  /** 制度は時期を持たず「いまの時期」で絞れないため、一覧の代わりに案内を出す。 */
  listHidden: boolean;
  renderRow: (item: CatalogItem) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        制度を読み込んでいます…
      </Typography>
    );
  }
  if (!data || (!data.ok && data.reason === "error")) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        制度の情報を取得できませんでした
      </Typography>
    );
  }
  if (!data.ok) {
    if (data.reason === "not_configured") return null;
    return (
      <Alert
        severity="info"
        action={
          <Button component={Link} href="/family" size="small">
            家族画面へ
          </Button>
        }
      >
        「家族」画面で住んでいる自治体を選ぶと、その自治体の子育て支援制度もここに出ます。
      </Alert>
    );
  }

  const heading = (
    <SectionHeading icon={<AccountBalanceOutlinedIcon fontSize="small" />}>
      {data.municipalityName}の制度
    </SectionHeading>
  );
  if (listHidden) {
    return (
      <Box>
        {heading}
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
          制度には時期の目安がありません。イベントのチップや検索から探せます
        </Typography>
      </Box>
    );
  }

  const { attribution } = data;
  return (
    <Box>
      {heading}
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
        出典: {attribution.source}（
        <MuiLink
          href={attribution.licenseUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {attribution.license}
        </MuiLink>
        ）。{attribution.notice}
      </Typography>
      {(expanded ? list : list.slice(0, COLLAPSED_PROGRAM_COUNT)).map(
        renderRow,
      )}
      {!expanded && list.length > COLLAPSED_PROGRAM_COUNT && (
        <Button size="small" onClick={() => setExpanded(true)} sx={{ mt: 1 }}>
          もっと見る（全{list.length}件）
        </Button>
      )}
      {list.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
          該当する制度はありません
        </Typography>
      )}
    </Box>
  );
}
