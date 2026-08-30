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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import { LifeEventProcedureRow } from "./LifeEventProcedureRow";

/**
 * 家族の手続きリスト。ライフイベントごとのセクションには分けず、family単位で
 * 1本のリストとして並べる。項目の編集・追加・削除・並べ替え、行政手続きか・時期の
 * 表示／編集はこの画面で完結する。
 *
 * 編集・追加・削除は Server Action + router.refresh() で取り直す（滅多に触らない
 * 20〜30件のリスト想定）。並べ替えだけはスマホでの D&D 中に表示が飛ばないよう、
 * ローカルの items を先に動かしてから保存する。
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

  // D&D 中に表示順を先行させるためのローカルコピー。サーバから新しい procedures が
  // 来たら（refresh 後）それに合わせ直す。並べ替え成功時は refresh しないので、
  // 楽観的に動かした順序がそのまま残る。
  const [items, setItems] = useState(procedures);
  useEffect(() => {
    setItems(procedures);
  }, [procedures]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 各項目の目安時期は、その項目が属するライフイベントの基準日から引く
  // （出産系は子の予定日／出生日、妊活などは started_on）。
  const childById = new Map(familyChildren.map((child) => [child.id, child]));
  const anchorByLifeEventId = new Map<string, LifeEventAnchorDates>(
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setError(null);

    startTransition(async () => {
      const result = await reorderLifeEventProcedures({
        orderedIds: next.map((item) => item.id),
      });
      if (!result.ok) {
        setItems(previous);
        setError(result.error);
        router.refresh();
      }
    });
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
        >
          {lifeEvents.map((event) => (
            <Chip
              key={event.id}
              label={event.title}
              size="small"
              variant="outlined"
            />
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialogOpen(true)}
            sx={{ ml: "auto" }}
          >
            ライフイベントを追加
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {items.length === 0 ? (
          <Alert severity="info">
            ライフイベントを追加すると、そのイベントでやることがここに並びます。追加したあとは自由に書き換えられます。
          </Alert>
        ) : (
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            {/*
              id を固定する。省略すると @dnd-kit がモジュール内カウンタで
              DndDescribedBy-N を採番し、dev の StrictMode 二重レンダーで
              サーバー(-0)とクライアント(-1)がずれて hydration mismatch になる。
            */}
            <DndContext
              id="life-event-procedures"
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
                    busy={isPending}
                    onTitleChange={(id, title) =>
                      run(() => updateLifeEventProcedureTitle({ id, title }))
                    }
                    onNoteChange={(id, note) =>
                      run(() => updateLifeEventProcedureNote({ id, note }))
                    }
                    onTimingChange={(id, change) =>
                      run(() =>
                        updateLifeEventProcedureTiming({ id, ...change }),
                      )
                    }
                    onDelete={setPendingDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </Paper>
        )}

        {lifeEvents.length > 0 && (
          <AddProcedureRow
            lifeEvents={lifeEvents}
            disabled={isPending}
            onAdd={(lifeEventId, title) =>
              run(() => addLifeEventProcedure({ lifeEventId, title }))
            }
          />
        )}
      </Stack>

      <AddLifeEventDialog
        open={dialogOpen}
        familyChildren={familyChildren}
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
 * リスト末尾に項目を1つ足す。どのライフイベント由来かは基準日を引くために要るので
 * （P6-3で使う）、イベントが2つ以上あるときだけ選ばせる。1つなら黙ってそれに紐づける。
 */
function AddProcedureRow({
  lifeEvents,
  disabled,
  onAdd,
}: {
  lifeEvents: LifeEvent[];
  disabled: boolean;
  onAdd: (lifeEventId: string, title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  // 既定は末尾のイベント（「末尾に足す」感覚に合わせて直近追加したものを選ぶ）。
  const [lifeEventId, setLifeEventId] = useState(
    lifeEvents[lifeEvents.length - 1]?.id ?? "",
  );

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed || !lifeEventId) return;
    onAdd(lifeEventId, trimmed);
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
      {lifeEvents.length > 1 && (
        <TextField
          select
          label="どのライフイベントか"
          value={lifeEventId}
          onChange={(event) => setLifeEventId(event.target.value)}
          size="small"
          fullWidth
          helperText="予定日・出生日からの目安時期をどのイベント基準で出すか"
        >
          {lifeEvents.map((event) => (
            <MenuItem key={event.id} value={event.id}>
              {event.title}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          size="small"
          onClick={handleAdd}
          disabled={disabled || title.trim() === "" || !lifeEventId}
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
  onClose,
}: {
  open: boolean;
  familyChildren: Child[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState(LIFE_EVENT_TEMPLATES[0].kind);
  // タイトルはテンプレート名を初期値にしつつ、家族が呼びたい名前
  // （「第2子の出産」など）に書き換えられるようにする。
  const [title, setTitle] = useState(LIFE_EVENT_TEMPLATES[0].title);
  const [childId, setChildId] = useState(familyChildren[0]?.id ?? "");
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
      const result = await addLifeEvent({ kind, title, childId });
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
            disabled={familyChildren.length === 0}
            helperText={
              familyChildren.length === 0
                ? "「家族」画面で子供を登録すると、予定日・出生日からの目安時期が出せるようになります"
                : "予定日・出生日から時期の目安を出すために使います"
            }
          >
            <MenuItem value="">選ばない</MenuItem>
            {familyChildren.map((child) => (
              <MenuItem key={child.id} value={child.id}>
                {child.displayName}
              </MenuItem>
            ))}
          </TextField>
          {familyChildren.length === 0 && (
            <Button
              component={Link}
              href="/family"
              size="small"
              sx={{ alignSelf: "flex-start" }}
            >
              家族画面へ
            </Button>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="caption" color="text.secondary">
            追加すると{template.items.length}
            件の項目がリストの末尾に入ります。中身はあとから自由に書き換えられます。
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
          disabled={isPending || title.trim() === ""}
        >
          追加する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
