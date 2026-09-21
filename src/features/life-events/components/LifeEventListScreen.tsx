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
import SearchIcon from "@mui/icons-material/Search";
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
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { Child } from "@/features/children/types";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/layout";
import {
  addLifeEvent,
  addLifeEventProcedure,
  addLifeEventProcedureToTask,
  deleteLifeEventProcedure,
  reorderLifeEventProcedures,
  undoLifeEventProcedureToTask,
  updateLifeEventProcedureNote,
  updateLifeEventProcedureTiming,
  updateLifeEventProcedureTitle,
} from "../actions";
import {
  findLifeEventTemplate,
  LIFE_EVENT_TEMPLATES,
} from "../default-templates";
import {
  EMPTY_ANCHOR_DATES,
  type LifeEventAnchorDates,
  resolveLifeEventProcedureDate,
} from "../timing";
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
  showProgramsLink,
}: {
  lifeEvents: LifeEvent[];
  procedures: LifeEventProcedure[];
  familyChildren: Child[];
  /** seido-data-hub が未設定の環境では「自治体の制度を探す」を出さない */
  showProgramsLink: boolean;
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
  // タスク化する項目。ボタンで即追加せず、名前・期限をプリセットしたモーダルで確定する。
  const [taskDialog, setTaskDialog] = useState<{
    procedure: LifeEventProcedure;
    presetDueOn: string;
  } | null>(null);
  // タスク化した直後だけ出す Undo トースト（レシピ材料 →「買うもの」と同じ流儀）。
  const [toast, setToast] = useState<{ taskId: string } | null>(null);

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

  function handleOpenAddToTask(procedure: LifeEventProcedure) {
    setError(null);
    const anchor =
      anchorByLifeEventId.get(procedure.lifeEventId) ?? EMPTY_ANCHOR_DATES;
    setTaskDialog({
      procedure,
      presetDueOn: resolveLifeEventProcedureDate(procedure, anchor) ?? "",
    });
  }

  function handleSubmitAddToTask(title: string, dueOn: string) {
    if (!taskDialog) return;
    const { procedure } = taskDialog;
    setError(null);
    startTransition(async () => {
      const result = await addLifeEventProcedureToTask({
        id: procedure.id,
        title,
        dueOn,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTaskDialog(null);
      setToast({ taskId: result.taskId });
    });
  }

  function handleUndoAddToTask() {
    if (!toast) return;
    const { taskId } = toast;
    setToast(null);
    startTransition(async () => {
      const result = await undoLifeEventProcedureToTask({ taskId });
      if (!result.ok) {
        setError(result.error);
      }
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
    <Box
      sx={{
        p: 2,
        pb: BOTTOM_NAV_CLEARANCE,
      }}
    >
      <Stack spacing={2}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {/* 自治体の子育て支援制度（seido-data-hub）から、テンプレに無い項目を見つけて足す */}
          {showProgramsLink && (
            <Button
              size="small"
              component={Link}
              href="/procedures/programs"
              startIcon={<SearchIcon fontSize="small" />}
            >
              自治体の制度を探す
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setDialogOpen(true)}
            sx={{ ml: "auto" }}
          >
            テンプレートから追加
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
          onAddProcedure={(kind, title, position) =>
            run(() =>
              addLifeEventProcedure({
                childId: activeChild.id,
                kind,
                title,
                url: "",
                isGovernment: false,
                position,
              }),
            )
          }
          onAddToTask={handleOpenAddToTask}
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

      <AddToTaskDialog
        key={taskDialog?.procedure.id ?? "none"}
        target={taskDialog}
        busy={isPending}
        onClose={() => setTaskDialog(null)}
        onSubmit={handleSubmitAddToTask}
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

      <Snackbar
        open={!!toast}
        onClose={() => setToast(null)}
        autoHideDuration={8000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: 72 }}
        message="タスクに追加しました"
        action={
          <Button color="inherit" size="small" onClick={handleUndoAddToTask}>
            元に戻す
          </Button>
        }
      />
    </Box>
  );
}

/**
 * 手続きの1項目をタスク化する前の確認モーダル。タスク名は項目名、期限は目安日で
 * プリセットしたうえで、どちらもその場で編集してから「追加する」。
 * target が null の間は閉じている（開くたびに key で作り直してプリセットを反映する）。
 */
function AddToTaskDialog({
  target,
  busy,
  onClose,
  onSubmit,
}: {
  target: { procedure: LifeEventProcedure; presetDueOn: string } | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (title: string, dueOn: string) => void;
}) {
  const [title, setTitle] = useState(target?.procedure.title ?? "");
  const [dueOn, setDueOn] = useState(target?.presetDueOn ?? "");

  return (
    <Dialog open={target !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>タスクに追加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="タスク名"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            size="small"
            fullWidth
            autoFocus
          />
          <TextField
            label="期限"
            type="date"
            value={dueOn}
            onChange={(event) => setDueOn(event.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={
              target?.presetDueOn
                ? "項目の目安日を入れています。変えられます。"
                : "この項目は目安日が出せないので空です。任意で入れられます。"
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          やめる
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(title.trim(), dueOn)}
          disabled={busy || title.trim() === ""}
        >
          追加する
        </Button>
      </DialogActions>
    </Dialog>
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
  onAddToTask,
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
  onAddProcedure: (kind: string, title: string, position: AddPosition) => void;
  onAddToTask: (procedure: LifeEventProcedure) => void;
  onDelete: (procedure: LifeEventProcedure) => void;
}) {
  const router = useRouter();

  // procedures は親が render するたびに新しい配列になる（filter で作り直している）ので、
  // 参照で比べて取り込むと、D&D 直後の楽観的な並びが「保存は成功しているのに
  // 親が再 render しただけ」で巻き戻る（並べ替えの成功時は refresh しないため、
  // 親の props はしばらく古い並びのまま）。中身で比べて本当に変わったときだけ取り込む。
  const [items, setItems] = useState(procedures);
  const serverSnapshot = JSON.stringify(procedures);
  const [syncedSnapshot, setSyncedSnapshot] = useState(serverSnapshot);
  if (serverSnapshot !== syncedSnapshot) {
    setSyncedSnapshot(serverSnapshot);
    setItems(procedures);
  }

  // チップで1つのライフイベントに絞り込む（null = すべて表示）。
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  // チップ行はイベントが2つ以上あるときだけ出る。絞り込み対象が消えた／チップ行ごと
  // 消えたときは、解除する手段が無くなるので null に戻す。
  useEffect(() => {
    if (
      activeEventId &&
      (lifeEvents.length <= 1 ||
        !lifeEvents.some((e) => e.id === activeEventId))
    ) {
      setActiveEventId(null);
    }
  }, [activeEventId, lifeEvents]);

  const filtering = activeEventId !== null;
  const visibleItems = filtering
    ? items.filter((item) => item.lifeEventId === activeEventId)
    : items;

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reordering, startReorder] = useTransition();

  // 追加フォームを開いている端（null = どちらも閉じている）。上下の入口で1つの
  // state を共有して、両端に入力欄が開いたままにならないようにする。
  const [addingAt, setAddingAt] = useState<AddPosition | null>(null);

  function handleAdd(kind: string, title: string, position: AddPosition) {
    setAddingAt(null);
    onAddProcedure(kind, title, position);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    // 絞り込み中は並べ替え不可（sort_order は子単位で1本なので部分並べ替えは座標がずれる）。
    if (filtering) return;
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

      {lifeEvents.length > 1 && (
        <Stack spacing={0.5}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", rowGap: 1 }}
          >
            <Chip
              label="すべて"
              size="small"
              color="primary"
              variant={activeEventId === null ? "filled" : "outlined"}
              onClick={() => setActiveEventId(null)}
            />
            {lifeEvents.map((event) => (
              <Chip
                key={event.id}
                label={findLifeEventTemplate(event.kind)?.title ?? event.kind}
                size="small"
                color="primary"
                variant={activeEventId === event.id ? "filled" : "outlined"}
                onClick={() =>
                  setActiveEventId((current) =>
                    current === event.id ? null : event.id,
                  )
                }
              />
            ))}
          </Stack>
          {filtering && (
            <Typography variant="caption" color="text.secondary">
              絞り込み中は並べ替えできません
            </Typography>
          )}
        </Stack>
      )}

      {/*
        追加の入口はリストと同じ枠（Paper）の中に、上下両端に置く。枠の外に1つだけ
        置いていたときは、リストの一部に見えないうえ長いリストでは下まで
        スクロールしないと見つからなかった。新しい項目は押した側の端に入る。
      */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <AddProcedureRow
          position="top"
          open={addingAt === "top"}
          disabled={busy || reordering}
          onOpen={() => setAddingAt("top")}
          onClose={() => setAddingAt(null)}
          onAdd={handleAdd}
        />

        {items.length === 0 ? (
          <EmptyListNote>
            「テンプレートから追加」か「項目を追加」で、この子の手続きがここに並びます。追加したあとは自由に書き換えられます。
          </EmptyListNote>
        ) : visibleItems.length === 0 ? (
          <EmptyListNote>このライフイベントの項目はありません。</EmptyListNote>
        ) : (
          <>
            <DndContext
              id={`life-event-procedures-${childId}`}
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={visibleItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {visibleItems.map((procedure) => (
                  <LifeEventProcedureRow
                    key={procedure.id}
                    procedure={procedure}
                    anchor={
                      anchorByLifeEventId.get(procedure.lifeEventId) ??
                      EMPTY_ANCHOR_DATES
                    }
                    busy={busy || reordering}
                    reorderDisabled={filtering}
                    onTitleChange={onTitleChange}
                    onNoteChange={onNoteChange}
                    onTimingChange={onTimingChange}
                    onAddToTask={onAddToTask}
                    onDelete={onDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <AddProcedureRow
              position="bottom"
              open={addingAt === "bottom"}
              disabled={busy || reordering}
              onOpen={() => setAddingAt("bottom")}
              onClose={() => setAddingAt(null)}
              onAdd={handleAdd}
            />
          </>
        )}
      </Paper>
    </Stack>
  );
}

/** 項目が無いときに枠の中へ出す案内（枠の最後の要素なので区切り線は付けない）。 */
function EmptyListNote({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
      {children}
    </Typography>
  );
}

/** 追加の入口はリストの上下両端にあり、押した側の端に項目が入る。 */
type AddPosition = "top" | "bottom";

/**
 * この子のリストの先頭／末尾に項目を1つ足す、枠の中の1行。どのライフイベント種別に
 * 入れるかを5種から選ぶ（まだ追加していない種別を選んだら、Server Action 側が
 * 空で1つ作ってぶら下げる）。開閉は上下で1つの state を共有するので親が持つ。
 */
function AddProcedureRow({
  position,
  open,
  disabled,
  onOpen,
  onClose,
  onAdd,
}: {
  position: AddPosition;
  open: boolean;
  disabled: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAdd: (kind: string, title: string, position: AddPosition) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>(LIFE_EVENT_TEMPLATES[0].kind);

  // 上の入口の下には必ず何か続く（項目か、項目が無いときの案内）。下の入口は
  // 枠の最後なので、Paper の枠線と二重にならないよう区切り線を付けない。
  const dividerSx =
    position === "top"
      ? ({ borderBottom: 1, borderColor: "divider" } as const)
      : {};

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle("");
    onAdd(kind, trimmed, position);
  }

  function handleCancel() {
    setTitle("");
    onClose();
  }

  if (!open) {
    return (
      <Button
        fullWidth
        size="small"
        startIcon={<AddIcon fontSize="small" />}
        onClick={onOpen}
        sx={{
          ...dividerSx,
          justifyContent: "flex-start",
          borderRadius: 0,
          px: 1,
          py: 0.75,
        }}
      >
        項目を追加
      </Button>
    );
  }

  return (
    <Stack spacing={1} sx={{ ...dividerSx, p: 1 }}>
      {/*
        autoFocus は付けない。この入力欄はリストの途中（上端／下端の行）に開くので、
        勝手にフォーカスが当たるとスマホでキーボードが出て画面が飛ぶ。
        ダイアログの中の入力欄（タスク化・制度の追加）とは事情が違う。
      */}
      <TextField
        label="項目名"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        size="small"
        fullWidth
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
        helperText={
          position === "top"
            ? "この子のこのライフイベントに入れます（まだ無ければ空で作成）。リストの先頭に入ります"
            : "この子のこのライフイベントに入れます（まだ無ければ空で作成）。リストの末尾に入ります"
        }
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
        <Button size="small" onClick={handleCancel}>
          やめる
        </Button>
      </Stack>
    </Stack>
  );
}

/**
 * テンプレートを1つ選んで、その項目をまとめてこの子のリストに入れる。
 *
 * 画面上は「テンプレートから追加」と呼ぶが、コード・DB 側の名前は LifeEvent のまま
 * にしてある。実態として作るのは life_events の行（＝絞り込みチップの単位）で、
 * テンプレートはその初期項目の供給元にすぎないため。UI で「テンプレート」と呼ぶのは
 * 「妊娠を追加します」より「妊娠の定番項目がまとめて入ります」の方が、
 * このボタンを押したときに起きることに近いから。
 */
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
  const [childId, setChildId] = useState(defaultChildId);
  const [startedOn, setStartedOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const template =
    LIFE_EVENT_TEMPLATES.find((t) => t.kind === kind) ??
    LIFE_EVENT_TEMPLATES[0];

  // 「イベント開始日」は妊活だけで使う（他は子の予定日/出生日が基準。timing.ts 参照）。
  const usesStartedOn = kind === "preconception";

  function handleKindChange(value: string) {
    const next = LIFE_EVENT_TEMPLATES.find((t) => t.kind === value);
    if (!next) return;
    setKind(next.kind);
    if (next.kind !== "preconception") setStartedOn("");
  }

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addLifeEvent({
        kind,
        childId,
        startedOn: usesStartedOn ? startedOn : "",
      });
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
      <DialogTitle>テンプレートから追加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label="テンプレート"
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
          {usesStartedOn && (
            <TextField
              label="イベント開始日"
              type="date"
              value={startedOn}
              onChange={(event) => setStartedOn(event.target.value)}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="妊活を始めた日。この日を基準に各項目の目安時期を出します"
            />
          )}
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
          disabled={isPending || childId === ""}
        >
          追加する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
