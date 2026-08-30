"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Child } from "@/features/children/types";
import {
  addLifeEvent,
  addLifeEventProcedure,
  deleteLifeEventProcedure,
  reorderLifeEventProcedures,
  updateLifeEventProcedureNote,
  updateLifeEventProcedureTiming,
  updateLifeEventProcedureTitle,
} from "../actions";
import { LIFE_EVENT_TEMPLATES } from "../default-templates";
import { EMPTY_ANCHOR_DATES, type LifeEventAnchorDates } from "../timing";
import type { LifeEvent, LifeEventProcedure } from "../types";
import {
  LifeEventProcedureRow,
  type TimingChange,
} from "./LifeEventProcedureRow";

/**
 * 手続きリスト。すべての手続きは子供単位で、画面は子供ごとのタブに分かれる。
 * 各タブの中身（並び順つき1本のリスト、項目の編集・追加・削除・並べ替え、行政手続きか
 * ・時期の表示／編集）は ChildLifeEventList に閉じている。
 *
 * 編集・追加・削除は Server Action + router.refresh() で取り直す（滅多に触らない
 * 20〜30件のリスト想定）。並べ替えだけはスマホでの D&D 中に表示が飛ばないよう、
 * ローカルの items を先に動かしてから保存する（ChildLifeEventList 側）。
 */
export function LifeEventListScreen({
  lifeEvents,
  procedures,
  familyChildren,
}: {
  lifeEvents: LifeEvent[];
  procedures: LifeEventProcedure[];
  familyChildren: Child[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LifeEventProcedure | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeChildId, setActiveChildId] = useState(
    familyChildren[0]?.id ?? "",
  );

  // 各項目の目安時期は、その項目が属するライフイベントの基準日から引く
  // （妊娠=子の予定日 / 出産=子の出生日 / 妊活=イベントの started_on）。
  const anchorByLifeEventId = useMemo(() => {
    const childById = new Map(familyChildren.map((child) => [child.id, child]));
    return new Map<string, LifeEventAnchorDates>(
      lifeEvents.map((event) => {
        const child = event.childId ? childById.get(event.childId) : undefined;
        return [
          event.id,
          {
            birthDate: child?.birthDate ?? null,
            expectedBirthDate: child?.expectedBirthDate ?? null,
            startedOn: event.startedOn,
          },
        ];
      }),
    );
  }, [familyChildren, lifeEvents]);

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    run(() => deleteLifeEventProcedure({ id: target.id }));
  }

  if (familyChildren.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/family" size="small">
              家族画面へ
            </Button>
          }
        >
          まず「家族」画面で子供を登録してください。手続きは子供ごとに管理します（妊活中で予定日が未定でも登録できます）。
        </Alert>
      </Box>
    );
  }

  const activeChild =
    familyChildren.find((child) => child.id === activeChildId) ??
    familyChildren[0];
  const childProcedures = procedures.filter(
    (procedure) => procedure.childId === activeChild.id,
  );
  const childLifeEvents = lifeEvents.filter(
    (event) => event.childId === activeChild.id,
  );

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex" }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialogOpen(true)}
            sx={{ ml: "auto" }}
          >
            ライフイベントを追加
          </Button>
        </Box>

        {familyChildren.length > 1 && (
          <Tabs
            value={activeChild.id}
            onChange={(_, value) => setActiveChildId(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            {familyChildren.map((child) => (
              <Tab key={child.id} value={child.id} label={child.displayName} />
            ))}
          </Tabs>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <ChildLifeEventList
          key={activeChild.id}
          childId={activeChild.id}
          procedures={childProcedures}
          lifeEvents={childLifeEvents}
          anchorByLifeEventId={anchorByLifeEventId}
          busy={isPending}
          onTitleChange={(id, title) =>
            run(() => updateLifeEventProcedureTitle({ id, title }))
          }
          onNoteChange={(id, note) =>
            run(() => updateLifeEventProcedureNote({ id, note }))
          }
          onTimingChange={(id, change) =>
            run(() => updateLifeEventProcedureTiming({ id, ...change }))
          }
          onAddProcedure={(kind, title) =>
            run(() =>
              addLifeEventProcedure({ childId: activeChild.id, kind, title }),
            )
          }
          onDelete={setPendingDelete}
        />
      </Stack>

      <AddLifeEventDialog
        key={activeChild.id}
        open={dialogOpen}
        familyChildren={familyChildren}
        defaultChildId={activeChild.id}
        onClose={() => setDialogOpen(false)}
      />

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
      >
        <DialogTitle>項目を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{pendingDelete?.title}」をリストから消します。元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>やめる</Button>
          <Button color="error" onClick={handleConfirmDelete}>
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/**
 * ひとりの子の手続きリスト（並び順つき1本）。タブ切り替えで丸ごと再マウントされる
 * 前提なので、並べ替えの楽観的更新に使う items ローカル state と DndContext の固定 id
 * はこの中に閉じている（[[project-dndkit-ssr-stable-id]]）。
 */
function ChildLifeEventList({
  childId,
  procedures,
  lifeEvents,
  anchorByLifeEventId,
  busy,
  onTitleChange,
  onNoteChange,
  onTimingChange,
  onAddProcedure,
  onDelete,
}: {
  childId: string;
  procedures: LifeEventProcedure[];
  lifeEvents: LifeEvent[];
  anchorByLifeEventId: Map<string, LifeEventAnchorDates>;
  busy: boolean;
  onTitleChange: (id: string, title: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onTimingChange: (id: string, change: TimingChange) => void;
  onAddProcedure: (kind: string, title: string) => void;
  onDelete: (procedure: LifeEventProcedure) => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState(procedures);
  useEffect(() => {
    setItems(procedures);
  }, [procedures]);

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reordering, startReorder] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setReorderError(null);

    startReorder(async () => {
      const result = await reorderLifeEventProcedures({
        childId,
        orderedIds: next.map((item) => item.id),
      });
      if (!result.ok) {
        setItems(previous);
        setReorderError(result.error);
        router.refresh();
      }
    });
  }

  return (
    <Stack spacing={2}>
      {reorderError && (
        <Alert severity="error" onClose={() => setReorderError(null)}>
          {reorderError}
        </Alert>
      )}

      {lifeEvents.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          {lifeEvents.map((event) => (
            <Chip
              key={event.id}
              label={event.title}
              size="small"
              variant="outlined"
            />
          ))}
        </Stack>
      )}

      {items.length === 0 ? (
        <Alert severity="info">
          「ライフイベントを追加」か「項目を追加」で、この子の手続きがここに並びます。追加したあとは自由に書き換えられます。
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <DndContext
            id={`life-event-procedures-${childId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((procedure) => (
                <LifeEventProcedureRow
                  key={procedure.id}
                  procedure={procedure}
                  anchor={
                    anchorByLifeEventId.get(procedure.lifeEventId) ??
                    EMPTY_ANCHOR_DATES
                  }
                  busy={busy || reordering}
                  onTitleChange={onTitleChange}
                  onNoteChange={onNoteChange}
                  onTimingChange={onTimingChange}
                  onDelete={onDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Paper>
      )}

      <AddProcedureRow disabled={busy || reordering} onAdd={onAddProcedure} />
    </Stack>
  );
}

/**
 * この子のリストの末尾に項目を1つ足す。どのライフイベント種別に入れるかを5種から
 * 選ぶ（まだ追加していない種別を選んだら、Server Action 側が空で1つ作ってぶら下げる）。
 */
function AddProcedureRow({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (kind: string, title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>(LIFE_EVENT_TEMPLATES[0].kind);

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(kind, trimmed);
    setTitle("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        size="small"
        startIcon={<AddIcon fontSize="small" />}
        onClick={() => setOpen(true)}
        sx={{ alignSelf: "flex-start" }}
      >
        項目を追加
      </Button>
    );
  }

  return (
    <Stack spacing={1}>
      <TextField
        label="項目名"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        size="small"
        fullWidth
        autoFocus
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleAdd();
          }
        }}
      />
      <TextField
        select
        label="どのライフイベントか"
        value={kind}
        onChange={(event) => setKind(event.target.value)}
        size="small"
        fullWidth
        helperText="この子のこのライフイベントに入れます（まだ無ければ空で作成）"
      >
        {LIFE_EVENT_TEMPLATES.map((template) => (
          <MenuItem key={template.kind} value={template.kind}>
            {template.title}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          size="small"
          onClick={handleAdd}
          disabled={disabled || title.trim() === ""}
        >
          追加する
        </Button>
        <Button
          size="small"
          onClick={() => {
            setTitle("");
            setOpen(false);
          }}
        >
          やめる
        </Button>
      </Stack>
    </Stack>
  );
}

function AddLifeEventDialog({
  open,
  familyChildren,
  defaultChildId,
  onClose,
}: {
  open: boolean;
  familyChildren: Child[];
  defaultChildId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState(LIFE_EVENT_TEMPLATES[0].kind);
  // タイトルはテンプレート名を初期値にしつつ、家族が呼びたい名前
  // （「第2子の出産」など）に書き換えられるようにする。
  const [title, setTitle] = useState(LIFE_EVENT_TEMPLATES[0].title);
  const [childId, setChildId] = useState(defaultChildId);
  const [startedOn, setStartedOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const template =
    LIFE_EVENT_TEMPLATES.find((t) => t.kind === kind) ??
    LIFE_EVENT_TEMPLATES[0];

  function handleKindChange(value: string) {
    const next = LIFE_EVENT_TEMPLATES.find((t) => t.kind === value);
    if (!next) return;
    setKind(next.kind);
    setTitle(next.title);
  }

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addLifeEvent({ kind, title, childId, startedOn });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>ライフイベントを追加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label="ライフイベント"
            value={kind}
            onChange={(event) => handleKindChange(event.target.value)}
            size="small"
            fullWidth
            helperText={template.description}
          >
            {LIFE_EVENT_TEMPLATES.map((option) => (
              <MenuItem key={option.kind} value={option.kind}>
                {option.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="このリストでの呼び方"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            select
            label="どの子のことか"
            value={childId}
            onChange={(event) => setChildId(event.target.value)}
            size="small"
            fullWidth
            helperText="予定日・出生日から時期の目安を出すために使います"
          >
            {familyChildren.map((child) => (
              <MenuItem key={child.id} value={child.id}>
                {child.displayName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="イベント開始日"
            type="date"
            value={startedOn}
            onChange={(event) => setStartedOn(event.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="妊活など、子の予定日ではなく「開始日」を基準にする項目の目安時期に使います"
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="caption" color="text.secondary">
            追加すると{template.items.length}
            件の項目がこの子のリストの末尾に入ります。中身はあとから自由に書き換えられます。
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          やめる
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={isPending || title.trim() === "" || childId === ""}
        >
          追加する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
