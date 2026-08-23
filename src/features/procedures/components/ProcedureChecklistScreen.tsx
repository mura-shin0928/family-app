"use client";

import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Child } from "@/features/children/types";
import { addDaysToDateString, daysUntil } from "@/lib/date";
import {
  addTemplateItem,
  addTemplateItemToTask,
  deleteTemplateItem,
  updateTemplateItem,
  updateTemplateTitle,
  verifyProcedure,
} from "../actions";
import {
  matchProceduresForItem,
  resolveProcedureDeadline,
  resolveTemplateDeadline,
} from "../deadline";
import type { MatchedProcedure } from "../queries";
import {
  PROCEDURE_CATEGORIES,
  type ProcedureCategory,
  type Template,
  type TemplateItem,
} from "../types";
import { ItemProcedureSearch } from "./ItemProcedureSearch";

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function ProcedureChecklistScreen({
  template,
  items,
  familyChildren,
  procedures,
  linkedTaskIdByKey,
  municipalityCode,
  areaCode,
}: {
  template: Template;
  items: TemplateItem[];
  familyChildren: Child[];
  procedures: MatchedProcedure[];
  linkedTaskIdByKey: Record<string, string>;
  municipalityCode: string | null;
  areaCode: string;
}) {
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    familyChildren[0]?.id ?? null,
  );
  const [editMode, setEditMode] = useState(false);

  const selectedChild =
    familyChildren.find((c) => c.id === selectedChildId) ?? null;

  const childAnchor = {
    birthDate: selectedChild?.birthDate ?? null,
    expectedBirthDate: selectedChild?.expectedBirthDate ?? null,
  };

  function refresh() {
    router.refresh();
  }

  return (
    <>
      {/* 全ページ共通のAppHeader(アカウントメニュー付き)はpage.tsx側で表示済み。
          ここではその直下に、手続き専用の第2バーを重ねて固定する
          （編集・編集を終わるボタンはスクロールしても常に押せるようにする）。 */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          top: { xs: 56, sm: 64 },
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar variant="dense">
          {editMode ? (
            <InlineTitleEditor
              templateId={template.id}
              title={template.title}
            />
          ) : (
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {template.title}
            </Typography>
          )}
          <Button
            size="small"
            variant={editMode ? "contained" : "outlined"}
            startIcon={<EditOutlinedIcon fontSize="small" />}
            onClick={() => setEditMode((current) => !current)}
          >
            {editMode ? "保存" : "編集"}
          </Button>
        </Toolbar>
      </AppBar>
      <Toolbar variant="dense" />

      <Box sx={{ p: 2, pb: 10 }}>
        <Stack spacing={2}>
          <ChildTabs
            familyChildren={familyChildren}
            selectedChildId={selectedChildId}
            onSelect={setSelectedChildId}
          />

          {selectedChild === null && (
            <Alert
              severity="info"
              action={
                <Button
                  component={Link}
                  href="/family"
                  size="small"
                  color="inherit"
                >
                  家族画面へ
                </Button>
              }
            >
              子供の情報を「家族」画面で登録すると、出産予定日・出生日からの目安期限が表示されます。
            </Alert>
          )}

          <Stack spacing={1.5}>
            {items.map((item) => (
              <ProcedureChecklistItem
                key={item.id}
                item={item}
                matches={matchProceduresForItem(
                  item.category,
                  procedures,
                  municipalityCode,
                )}
                childAnchor={childAnchor}
                childId={selectedChild?.id ?? null}
                areaCode={areaCode}
                linkedTaskId={
                  linkedTaskIdByKey[`${item.id}:${selectedChild?.id ?? ""}`]
                }
                editMode={editMode}
                onChanged={refresh}
              />
            ))}
          </Stack>

          {editMode && (
            <AddItemForm templateId={template.id} onAdded={refresh} />
          )}
        </Stack>
      </Box>
    </>
  );
}

// 子供の追加・編集は「家族」画面（ChildrenSection）に置く。ここは選択のみの
// 読み取り専用タブ — 手続きテンプレートは子どもの情報を読むだけの一利用者のため。
function ChildTabs({
  familyChildren,
  selectedChildId,
  onSelect,
}: {
  familyChildren: Child[];
  selectedChildId: string | null;
  onSelect: (childId: string) => void;
}) {
  if (familyChildren.length === 0) return null;

  return (
    <Tabs
      value={selectedChildId ?? false}
      onChange={(_, value) => onSelect(value)}
      variant="scrollable"
      sx={{ minHeight: 0 }}
    >
      {familyChildren.map((child) => (
        <Tab
          key={child.id}
          value={child.id}
          label={child.displayName}
          sx={{ minHeight: 0, py: 1 }}
        />
      ))}
    </Tabs>
  );
}

// 編集中はテンプレート名のラベル表示は不要 — AppBarのタイトル位置にそのまま
// 編集可能なフィールドを差し込むだけにする（別枠の「テンプレート名」欄は持たない）。
function InlineTitleEditor({
  templateId,
  title,
}: {
  templateId: string;
  title: string;
}) {
  const [value, setValue] = useState(title);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleBlur() {
    if (value.trim() === "" || value === title) return;
    startTransition(async () => {
      await updateTemplateTitle({ templateId, title: value });
      router.refresh();
    });
  }

  return (
    <TextField
      variant="standard"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={handleBlur}
      size="small"
      disabled={isPending}
      sx={{ flexGrow: 1, mr: 1 }}
      slotProps={{ htmlInput: { style: { fontSize: "1.25rem" } } }}
    />
  );
}

function ProcedureChecklistItem({
  item,
  matches,
  childAnchor,
  childId,
  areaCode,
  linkedTaskId,
  editMode,
  onChanged,
}: {
  item: TemplateItem;
  matches: MatchedProcedure[];
  childAnchor: { birthDate: string | null; expectedBirthDate: string | null };
  childId: string | null;
  areaCode: string;
  linkedTaskId: string | undefined;
  editMode: boolean;
  onChanged: () => void;
}) {
  const published = matches.filter((m) => m.status === "published");
  const drafts = matches.filter((m) => m.status === "draft");
  const best = published[0] ?? null;

  const officialDeadline = best
    ? resolveProcedureDeadline(best, childAnchor)
    : null;
  const estimateOn = resolveTemplateDeadline(item, childAnchor);

  const dueLabel = officialDeadline?.on
    ? `${formatDate(officialDeadline.on)}まで（自治体・国の情報より）`
    : officialDeadline?.windowTo
      ? `${formatDate(officialDeadline.windowFrom ?? officialDeadline.windowTo)}〜${formatDate(officialDeadline.windowTo)}が目安（自治体・国の情報より）`
      : estimateOn
        ? `${formatDate(estimateOn)}ごろが目安`
        : null;

  return (
    <Accordion disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack sx={{ width: "100%" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
              {item.title}
            </Typography>
            {linkedTaskId && (
              <Chip
                size="small"
                icon={<CheckCircleOutlinedIcon />}
                label="やることに追加済み"
                color="success"
                variant="outlined"
              />
            )}
          </Stack>
          {dueLabel && (
            <Typography variant="caption" color="text.secondary">
              {dueLabel}
            </Typography>
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          {item.note && (
            <Typography variant="body2" color="text.secondary">
              {item.note}
            </Typography>
          )}

          {best ? (
            <ProcedureDetail procedure={best} deadlineLabel={dueLabel} />
          ) : drafts.length > 0 ? (
            <Alert severity="info">
              自治体・国の情報を取り込み済みですが、まだ内容の確認待ちです。
            </Alert>
          ) : item.category ? (
            <Alert severity="warning" variant="outlined">
              この項目の自治体・国の制度情報はまだ登録されていません。
            </Alert>
          ) : null}

          {drafts.map((draft) => (
            <DraftProcedureCard
              key={draft.id}
              procedure={draft}
              onVerified={onChanged}
            />
          ))}

          {childId && !editMode && (
            <AddToTaskButton
              item={item}
              childId={childId}
              procedure={best}
              dueOn={
                officialDeadline?.on ?? officialDeadline?.windowTo ?? estimateOn
              }
              alreadyAdded={!!linkedTaskId}
            />
          )}

          {item.category && best === null && (
            <ItemSearchToggle
              category={item.category}
              areaCode={areaCode}
              onIngested={onChanged}
            />
          )}

          {editMode && (
            <EditItemForm
              item={item}
              childAnchor={childAnchor}
              onChanged={onChanged}
            />
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function ProcedureDetail({
  procedure,
  deadlineLabel,
}: {
  procedure: MatchedProcedure;
  deadlineLabel: string | null;
}) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2">{procedure.summary}</Typography>
      {procedure.benefits.length > 0 && (
        <Stack spacing={0.5}>
          {procedure.benefits.map((benefit) => (
            <Typography variant="body2" key={benefit.label}>
              ・{benefit.label}
            </Typography>
          ))}
        </Stack>
      )}
      {procedure.whereToApply && (
        <Typography variant="caption" color="text.secondary">
          提出先: {procedure.whereToApply}
        </Typography>
      )}
      {procedure.documents && (
        <Typography variant="caption" color="text.secondary">
          必要なもの: {procedure.documents}
        </Typography>
      )}
      <Button
        size="small"
        variant="text"
        startIcon={<OpenInNewIcon fontSize="small" />}
        component="a"
        href={procedure.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ alignSelf: "flex-start" }}
      >
        自治体・国のページを見る
      </Button>
      {!deadlineLabel && (
        <Typography variant="caption" color="text.secondary">
          期限の記載はありません。
        </Typography>
      )}
    </Stack>
  );
}

function DraftProcedureCard({
  procedure,
  onVerified,
}: {
  procedure: MatchedProcedure;
  onVerified: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleVerify() {
    setError(null);
    startTransition(async () => {
      const result = await verifyProcedure({ procedureId: procedure.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onVerified();
    });
  }

  return (
    <Stack
      spacing={1}
      sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}
    >
      <Typography variant="body2">{procedure.title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {procedure.summary}
      </Typography>
      <Button
        size="small"
        variant="text"
        component="a"
        href={procedure.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        startIcon={<OpenInNewIcon fontSize="small" />}
        sx={{ alignSelf: "flex-start" }}
      >
        出典ページを見る
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        size="small"
        variant="contained"
        onClick={handleVerify}
        disabled={isPending}
        sx={{ alignSelf: "flex-start" }}
      >
        内容を確認した
      </Button>
    </Stack>
  );
}

function AddToTaskButton({
  item,
  childId,
  procedure,
  dueOn,
  alreadyAdded,
}: {
  item: TemplateItem;
  childId: string;
  procedure: MatchedProcedure | null;
  dueOn: string | null;
  alreadyAdded: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await addTemplateItemToTask({
        templateItemId: item.id,
        childId,
        title: item.title,
        dueOn: dueOn ?? "",
        url: procedure?.sourceUrl ?? "",
        note: procedure?.whereToApply ?? "",
        procedureId: procedure?.id ?? "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
      <Button
        size="small"
        variant={alreadyAdded ? "outlined" : "contained"}
        onClick={handleClick}
        disabled={isPending}
      >
        {alreadyAdded ? "もう一度やることに追加する" : "やることに追加する"}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}

function ItemSearchToggle({
  category,
  areaCode,
  onIngested,
}: {
  category: ProcedureCategory;
  areaCode: string;
  onIngested: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        size="small"
        variant="outlined"
        startIcon={<SearchIcon fontSize="small" />}
        onClick={() => setOpen(true)}
        sx={{ alignSelf: "flex-start" }}
      >
        この項目の制度情報を探す
      </Button>
    );
  }

  return (
    <ItemProcedureSearch
      category={category}
      areaCode={areaCode}
      onIngested={onIngested}
    />
  );
}

function EditItemForm({
  item,
  childAnchor,
  onChanged,
}: {
  item: TemplateItem;
  childAnchor: { birthDate: string | null; expectedBirthDate: string | null };
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note ?? "");
  const [category, setCategory] = useState(item.category ?? "");
  const [anchorEvent, setAnchorEvent] = useState(item.anchorEvent ?? "");
  const [offsetDays, setOffsetDays] = useState(
    item.offsetDays === null ? "" : String(item.offsetDays),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // 日数だけの入力は分かりにくいため、選択中の子供の基準日が分かればカレンダーでも
  // 指定できるようにする（相互に同期する。保存されるのは常にoffsetDays）。
  const referenceDate =
    anchorEvent === "birth"
      ? childAnchor.birthDate
      : anchorEvent === "expected_birth"
        ? childAnchor.expectedBirthDate
        : null;
  const calendarDate =
    referenceDate !== null && offsetDays !== ""
      ? addDaysToDateString(referenceDate, Number(offsetDays))
      : "";

  function handleCalendarChange(value: string) {
    if (referenceDate === null) return;
    setOffsetDays(value === "" ? "" : String(daysUntil(value, referenceDate)));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateTemplateItem({
        itemId: item.id,
        title,
        note,
        category,
        anchorEvent,
        offsetDays: offsetDays === "" ? "" : Number(offsetDays),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTemplateItem({ itemId: item.id });
      if (result.ok) onChanged();
    });
  }

  return (
    <Stack
      spacing={1.5}
      sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}
    >
      <TextField
        label="タイトル"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        size="small"
        fullWidth
      />
      <TextField
        label="メモ"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        size="small"
        fullWidth
        multiline
      />
      <TextField
        select
        label="カテゴリ（自治体・国の情報との対応付け）"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        size="small"
        fullWidth
      >
        <MenuItem value="">自由項目（対応付けしない）</MenuItem>
        {PROCEDURE_CATEGORIES.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="基準"
        value={anchorEvent}
        onChange={(event) => setAnchorEvent(event.target.value)}
        size="small"
        fullWidth
      >
        <MenuItem value="">なし</MenuItem>
        <MenuItem value="expected_birth">出産予定日</MenuItem>
        <MenuItem value="birth">出生日</MenuItem>
      </TextField>
      <Stack direction="row" spacing={1}>
        <TextField
          label="日数（負=前）"
          type="number"
          value={offsetDays}
          onChange={(event) => setOffsetDays(event.target.value)}
          size="small"
          sx={{ flex: 1 }}
        />
        <TextField
          label="目安の日付"
          type="date"
          value={calendarDate}
          onChange={(event) => handleCalendarChange(event.target.value)}
          size="small"
          sx={{ flex: 1 }}
          disabled={referenceDate === null}
          helperText={
            referenceDate === null
              ? "「家族」画面で子供の日付を登録すると使えます"
              : undefined
          }
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={isPending || title.trim() === ""}
        >
          保存
        </Button>
        <Button
          size="small"
          color="error"
          startIcon={<DeleteOutlineIcon fontSize="small" />}
          onClick={handleDelete}
          disabled={isPending}
        >
          この項目を削除
        </Button>
      </Stack>
    </Stack>
  );
}

function AddItemForm({
  templateId,
  onAdded,
}: {
  templateId: string;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addTemplateItem({
        templateId,
        title,
        note: "",
        category: "",
        anchorEvent: "",
        offsetDays: "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      onAdded();
    });
  }

  return (
    <Stack direction="row" spacing={1}>
      <TextField
        label="新しい項目を追加"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        size="small"
        fullWidth
      />
      <Button
        variant="outlined"
        onClick={handleAdd}
        disabled={isPending || title.trim() === ""}
      >
        追加
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
