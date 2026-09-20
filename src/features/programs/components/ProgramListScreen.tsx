"use client";

import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MuiLink from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Child } from "@/features/children/types";
import { addLifeEventProcedure } from "@/features/life-events/actions";
import { LIFE_EVENT_TEMPLATES } from "@/features/life-events/default-templates";
import type { LifeEventKind } from "@/features/life-events/types";
import { todayInJst } from "@/lib/date";
import {
  ageInMonths,
  defaultCategoryFor,
  type ProgramCategoryCode,
  type ProgramCategoryFilter,
  programTitle,
  selectPrograms,
} from "../filter";
import type { Attribution, Program, ProgramCategory } from "../types";

/**
 * 自治体＋都道府県の制度一覧（「一覧で気づく」）。子供ごとのタブで、その子の時期に
 * 合うものに絞る（生まれていれば月齢、生まれる前は「妊娠・出産」）。気になった制度は
 * 名前と公式ページの URL をその子の手続きリストに「項目として追加」できる。
 */
export function ProgramListScreen({
  programs,
  categories,
  attribution,
  areaNames,
  familyChildren,
}: {
  programs: Program[];
  /** 絞り込みチップ（「すべて」の後ろに並ぶ）。 */
  categories: ProgramCategory<ProgramCategoryCode>[];
  attribution: Attribution;
  areaNames: Record<string, string>;
  familyChildren: Child[];
}) {
  const [activeChildId, setActiveChildId] = useState(
    familyChildren[0]?.id ?? "",
  );
  const activeChild =
    familyChildren.find((child) => child.id === activeChildId) ??
    familyChildren[0];

  return (
    <Box
      sx={{
        p: 2,
        // 下部ナビ（56px + セーフエリア）の下に文字が潜らないようにする。
        // pb: 10（80px）固定だと、ホームインジケータのある端末で最後の数pxが隠れる。
        pb: "calc(16px + 56px + env(safe-area-inset-bottom))",
      }}
    >
      <Stack spacing={2}>
        {/* レジストリの更新は2025年8月で止まっている（プラン §6 鮮度の表示）。行ごとには出さない。 */}
        <Alert severity="warning">
          2025年8月時点の東京都のデータです。最新の内容は各制度の公式ページで確認してください。
        </Alert>

        {!activeChild ? (
          <Alert
            severity="info"
            action={
              <Button component={Link} href="/family" size="small">
                家族画面へ
              </Button>
            }
          >
            「家族」画面で子供を登録すると、その子の時期に合う制度に絞って、手続きリストに追加できます。
          </Alert>
        ) : (
          <>
            {familyChildren.length > 1 && (
              <Tabs
                value={activeChild.id}
                onChange={(_, value) => setActiveChildId(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                {familyChildren.map((child) => (
                  <Tab
                    key={child.id}
                    value={child.id}
                    label={child.displayName}
                  />
                ))}
              </Tabs>
            )}
            {/* 子を切り替えたら、その子の時期に合わせてカテゴリを選び直す */}
            <ChildProgramList
              key={activeChild.id}
              child={activeChild}
              programs={programs}
              categories={categories}
              areaNames={areaNames}
            />
          </>
        )}

        <Typography variant="caption" color="text.secondary" component="p">
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
      </Stack>
    </Box>
  );
}

function ChildProgramList({
  child,
  programs,
  categories,
  areaNames,
}: {
  child: Child;
  programs: Program[];
  categories: ProgramCategory<ProgramCategoryCode>[];
  areaNames: Record<string, string>;
}) {
  const ageMonths = child.birthDate
    ? ageInMonths(child.birthDate, todayInJst())
    : null;
  const [category, setCategory] = useState<ProgramCategoryFilter>(
    defaultCategoryFor(ageMonths),
  );
  const [adding, setAdding] = useState<Program | null>(null);
  const [addedTitle, setAddedTitle] = useState<string | null>(null);

  const visible = selectPrograms(programs, { ageMonths, category });
  const pregnancyName =
    categories.find((option) => option.code === defaultCategoryFor(null))
      ?.name ?? "";

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {ageMonths === null
          ? `${child.displayName}はまだ生まれていないので、「${pregnancyName}」から表示しています。`
          : `生後${ageMonths}か月の${child.displayName}の対象外とわかる制度（年齢の範囲外）は除いています。`}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        <Chip
          label="すべて"
          size="small"
          color="primary"
          variant={category === "all" ? "filled" : "outlined"}
          onClick={() => setCategory("all")}
        />
        {categories.map((option) => (
          <Chip
            key={option.code}
            label={option.name}
            size="small"
            color="primary"
            variant={category === option.code ? "filled" : "outlined"}
            onClick={() => setCategory(option.code)}
          />
        ))}
      </Stack>

      {visible.length === 0 ? (
        <Alert severity="info">この条件に合う制度はありません。</Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          {visible.map((program) => (
            <ProgramRow
              key={program.id}
              program={program}
              areaName={areaNames[program.areaCode]}
              onAdd={() => setAdding(program)}
            />
          ))}
        </Paper>
      )}

      <AddProgramDialog
        key={adding?.id ?? "none"}
        program={adding}
        child={child}
        onClose={() => setAdding(null)}
        onAdded={(title) => {
          setAdding(null);
          setAddedTitle(title);
        }}
      />

      <Snackbar
        open={addedTitle !== null}
        onClose={() => setAddedTitle(null)}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: 72 }}
        message={`「${addedTitle}」を${child.displayName}の手続きに追加しました`}
        action={
          <Button
            color="inherit"
            size="small"
            component={Link}
            href="/procedures"
          >
            手続きを見る
          </Button>
        }
      />
    </Stack>
  );
}

function ProgramRow({
  program,
  areaName,
  onAdd,
}: {
  program: Program;
  areaName: string | undefined;
  onAdd: () => void;
}) {
  const title = programTitle(program);
  // 自治体での呼び名が標準名と違えば、何の制度かを添える（例: 「エンジェル教室」）
  const details = [
    areaName,
    title !== program.canonicalName ? program.canonicalName : null,
  ].filter(Boolean);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        pl: 1.5,
        pr: 0.5,
        py: 0.75,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ overflowWrap: "break-word" }}>
          {title}
        </Typography>
        {details.length > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", overflowWrap: "break-word" }}
          >
            {details.join("・")}
          </Typography>
        )}
      </Box>
      <IconButton
        component="a"
        href={program.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        aria-label={`${title}の公式ページを開く`}
      >
        <OpenInNewIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label={`${title}を手続きに追加`}
        onClick={onAdd}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

/**
 * 制度を手続きリストの項目として足す前の確認。項目名（呼び名でプリセット、編集可）と、
 * どのライフイベントに入れるかを選ぶ。公式ページの URL と「行政手続き」は自動で付く。
 */
function AddProgramDialog({
  program,
  child,
  onClose,
  onAdded,
}: {
  program: Program | null;
  child: Child;
  onClose: () => void;
  onAdded: (title: string) => void;
}) {
  const [title, setTitle] = useState(program ? programTitle(program) : "");
  // 生まれる前は「妊娠」、生まれていれば「出産」に入れておく（変えられる）
  const [kind, setKind] = useState<LifeEventKind>(
    child.birthDate ? "birth" : "pregnancy",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!program) return;
    const trimmed = title.trim();
    setError(null);
    startTransition(async () => {
      const result = await addLifeEventProcedure({
        childId: child.id,
        kind,
        title: trimmed,
        url: program.sourceUrl,
        isGovernment: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onAdded(trimmed);
    });
  }

  return (
    <Dialog open={program !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{child.displayName}の手続きに追加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="項目名"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            size="small"
            fullWidth
            autoFocus
            helperText="公式ページのリンクも一緒に入ります"
          />
          <TextField
            select
            label="どのライフイベントか"
            value={kind}
            onChange={(event) => setKind(event.target.value as LifeEventKind)}
            size="small"
            fullWidth
          >
            {LIFE_EVENT_TEMPLATES.map((template) => (
              <MenuItem key={template.kind} value={template.kind}>
                {template.title}
              </MenuItem>
            ))}
          </TextField>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          やめる
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending || title.trim() === ""}
        >
          追加する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
