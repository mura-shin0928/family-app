"use client";

import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
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
        placeholder="手続きや制度を探す"
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

      <Box>
        {!searching && chip === "current" && stage && (
          <SectionHeading>いまの時期 ─ {stage}</SectionHeading>
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

      {showPrograms && (
        <ProgramSection
          loading={area.isPending}
          data={areaData}
          list={programList}
          collapsed={!searching && chip === "current"}
          renderRow={renderRow}
        />
      )}

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
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle1"
      component="h2"
      sx={{
        fontWeight: 700,
        pb: 0.5,
        borderBottom: 2,
        borderColor: "divider",
      }}
    >
      {children}
    </Typography>
  );
}

/** 「いまの時期」で最初に出す制度の件数。制度は時期を持たず全件が当たるため絞る。 */
const COLLAPSED_PROGRAM_COUNT = 5;

function ProgramSection({
  loading,
  data,
  list,
  collapsed,
  renderRow,
}: {
  loading: boolean;
  data: Awaited<ReturnType<typeof fetchAreaCatalog>> | undefined;
  list: CatalogItem[];
  collapsed: boolean;
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

  const { attribution } = data;
  return (
    <Box>
      <SectionHeading>{data.municipalityName}の制度</SectionHeading>
      {(collapsed && !expanded
        ? list.slice(0, COLLAPSED_PROGRAM_COUNT)
        : list
      ).map(renderRow)}
      {collapsed && !expanded && list.length > COLLAPSED_PROGRAM_COUNT && (
        <Button size="small" onClick={() => setExpanded(true)} sx={{ mt: 1 }}>
          すべて見る（{list.length}件）
        </Button>
      )}
      {list.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
          該当する制度はありません
        </Typography>
      )}
      <Typography
        variant="caption"
        component="p"
        sx={{ color: "text.secondary", mt: 1 }}
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
    </Box>
  );
}
