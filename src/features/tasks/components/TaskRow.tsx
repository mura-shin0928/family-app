"use client";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import LinkIcon from "@mui/icons-material/Link";
import NotesIcon from "@mui/icons-material/Notes";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { PurchaseLocationOptions } from "@/features/purchase-locations/components/PurchaseLocationOptions";
import type { PurchaseLocation } from "@/features/purchase-locations/types";
import { formatRelativeDue } from "@/lib/date";
import type { TaskDTO } from "../types";

type Props = {
  task: TaskDTO;
  today: string;
  locations: PurchaseLocation[];
  onToggle: (task: TaskDTO) => void;
  onDueDateChange: (task: TaskDTO, dueOn: string | null) => void;
  onTitleChange: (task: TaskDTO, title: string) => void;
  onUrlChange: (task: TaskDTO, url: string) => void;
  onNoteChange: (task: TaskDTO, note: string) => void;
  onPurchaseToggle: (task: TaskDTO) => void;
  onPurchaseLocationChange: (task: TaskDTO, locationId: string | null) => void;
  onDelete: (task: TaskDTO) => void;
};

export function TaskRow({
  task,
  today,
  locations,
  onToggle,
  onDueDateChange,
  onTitleChange,
  onUrlChange,
  onNoteChange,
  onPurchaseToggle,
  onPurchaseLocationChange,
  onDelete,
}: Props) {
  const [editingDue, setEditingDue] = useState(false);
  const [draftDue, setDraftDue] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [locationAnchor, setLocationAnchor] = useState<HTMLElement | null>(
    null,
  );
  const done = task.status === "done";
  const hasDetails = !!(task.url || task.note);
  // 論理削除済みの場所idは「登録済みに無い = 未設定」として扱う。
  const selectedLocation =
    locations.find((location) => location.id === task.purchaseLocationId) ??
    null;

  function commitTitle(value: string) {
    const trimmed = value.trim();
    setEditingTitle(false);
    if (trimmed && trimmed !== task.title) {
      onTitleChange(task, trimmed);
    }
  }

  function openDueEditor() {
    setDraftDue(task.dueOn ?? "");
    setEditingDue(true);
  }

  function commitDue(value: string | null) {
    onDueDateChange(task, value);
    setEditingDue(false);
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1,
        py: 0.25,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Checkbox
          checked={done}
          onChange={() => onToggle(task)}
          color="success"
          size="small"
          aria-label={done ? "未完了に戻す" : "完了にする"}
          // 行の高さを詰めるため既定の padding: 9px を 4px に。
          // メタ行の pl（下記）はこの幅（20 + 8 = 28px）に合わせている。
          sx={{ p: 0.5 }}
        />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          {editingTitle ? (
            <TextField
              multiline
              fullWidth
              size="small"
              variant="standard"
              autoFocus
              defaultValue={task.title}
              onFocus={(event) => event.target.select()}
              onBlur={(event) => commitTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  setEditingTitle(false);
                }
              }}
              slotProps={{ htmlInput: { style: { fontSize: "1rem" } } }}
            />
          ) : (
            <Typography
              variant="body2"
              onClick={() => setEditingTitle(true)}
              sx={{
                cursor: "text",
                overflowWrap: "break-word",
                textDecoration: done ? "line-through" : "none",
                color: done ? "text.disabled" : "text.primary",
              }}
            >
              {task.title}
            </Typography>
          )}
        </Box>

        <IconButton
          onClick={() => setDetailsOpen((current) => !current)}
          color={hasDetails ? "primary" : "default"}
          aria-pressed={detailsOpen}
          aria-label={hasDetails ? "URL・メモを編集" : "URL・メモを追加"}
          size="small"
        >
          {hasDetails ? (
            <NotesIcon fontSize="small" />
          ) : (
            <NotesOutlinedIcon fontSize="small" />
          )}
        </IconButton>

        <IconButton
          onClick={() => onPurchaseToggle(task)}
          color={task.isPurchase ? "primary" : "default"}
          aria-pressed={task.isPurchase}
          aria-label={task.isPurchase ? "買うものから外す" : "買うものにする"}
          size="small"
        >
          {task.isPurchase ? (
            <ShoppingCartIcon fontSize="small" />
          ) : (
            <ShoppingCartOutlinedIcon fontSize="small" />
          )}
        </IconButton>

        <IconButton
          onClick={() => onDelete(task)}
          aria-label="削除"
          size="small"
          sx={{ color: "text.disabled" }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

      {/*
        メタ行（期限 · 場所）はタイトル行から出して右アイコンの下に全幅で置く。
        iPhone 375px 幅ではタイトル行の残り幅（約178px）に「あと32日 · 場所名」が
        入らないため。pl はタイトル左端に合わせる: Checkbox(20 + p:0.5*2 = 28px)
        ＋ 行の gap(8px) = 36px。先頭ボタンは pl:0 なのでアイコンがこの位置に来る。
        折り返さず1行固定にし、はみ出す場所名は省略する（カード高さを揃える）。
      */}
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          alignItems: editingDue ? "flex-start" : "center",
          mt: 0.25,
          pl: "36px",
          pr: 1,
          // 編集中の期限エディタは縦積みの背の高いパネル。overflow: hidden を
          // 当てるとボタンが切れて操作不能になるので、非編集時だけ省略する。
          ...(editingDue ? {} : { overflow: "hidden" }),
        }}
      >
        {/*
          iOSではネイティブdateピッカー操作時に、他ボタンへのタップより先に
          onBlurが発火しeditingDueがfalseになってボタンごと消えてしまう
          （「期限なしにする」が反応しない不具合の原因だった）。QuickCaptureBar
          の期限パネルと同様、blurではなくClickAwayListenerで閉じる。
        */}
        <ClickAwayListener onClickAway={() => setEditingDue(false)}>
          <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {editingDue ? (
              <Box sx={{ mt: 0.5 }}>
                {/*
                  autoFocusは付けない。iOSでは空のdate inputに自動フォーカス
                  すると、ユーザーが何も操作していないのに「今日」でchangeが
                  発火してしまう不具合があるため（QuickCaptureBarの期限パネル
                  も同じ理由でautoFocusなし）。
                */}
                {/*
                  onChangeでは確定しない。iOSでは自動フォーカスでなく手動タップ
                  でも、空のdate inputを開いた時点でピッカーが「今日」を仮表示し
                  changeが発火することがある。ここで即確定・即クローズしていると、
                  そのタップだけで期限が無言で「今日」になり、パネルも同時に閉じる
                  ため「タップしても何も起きない（が期限は変わっている）」ように
                  見えてしまっていた。値はdraftDueに留め、下のボタンでの明示的な
                  確定操作でのみonDueDateChangeを呼ぶ。
                */}
                <TextField
                  type="date"
                  size="small"
                  variant="standard"
                  value={draftDue}
                  onChange={(event) => setDraftDue(event.target.value)}
                  slotProps={{
                    // 16px未満だとiOSでフォーカス時に画面全体がズームされる。
                    // 16pxにする分、ボタンは横に並べず下に積んで幅の競合を避ける。
                    htmlInput: { style: { fontSize: "1rem" } },
                  }}
                />
                <Button
                  size="small"
                  disabled={!draftDue}
                  sx={{
                    display: "block",
                    mt: 0.5,
                    p: 0,
                    minWidth: 0,
                    textTransform: "none",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => commitDue(draftDue || null)}
                >
                  設定
                </Button>
                {task.dueOn && (
                  <Button
                    size="small"
                    sx={{
                      display: "block",
                      mt: 0.5,
                      p: 0,
                      minWidth: 0,
                      textTransform: "none",
                      fontSize: "0.75rem",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => commitDue(null)}
                  >
                    期限なしにする
                  </Button>
                )}
              </Box>
            ) : (
              <Button
                size="small"
                onClick={openDueEditor}
                aria-label={task.dueOn ? undefined : "期限を設定"}
                startIcon={<CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  flexShrink: 0,
                  py: 0.5,
                  pl: 0,
                  pr: 0.5,
                  minWidth: 0,
                  textTransform: "none",
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  // startIcon の既定の負マージンを消し、アイコンをメタ行の pl に揃える。
                  "& .MuiButton-startIcon": {
                    ml: 0,
                    mr: task.dueOn ? 0.5 : 0,
                  },
                }}
              >
                {task.dueOn ? formatRelativeDue(task.dueOn, today) : ""}
              </Button>
            )}
          </Box>
        </ClickAwayListener>

        {task.isPurchase && (
          <Button
            size="small"
            onClick={(event) => setLocationAnchor(event.currentTarget)}
            aria-label={selectedLocation ? undefined : "買う場所を選ぶ"}
            startIcon={<PlaceOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              minWidth: 0,
              p: 0.5,
              overflow: "hidden",
              textTransform: "none",
              fontSize: "0.75rem",
              // 設定済みかどうかはラベルの有無で分かるので色は常に text.secondary。
              color: "text.secondary",
              "& .MuiButton-startIcon": {
                mx: 0,
                mr: selectedLocation ? 0.5 : 0,
                flexShrink: 0,
              },
            }}
          >
            {selectedLocation && (
              <Box
                component="span"
                sx={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedLocation.name}
              </Box>
            )}
          </Button>
        )}
      </Box>

      {task.isPurchase && (
        <Menu
          anchorEl={locationAnchor}
          open={!!locationAnchor}
          onClose={() => setLocationAnchor(null)}
        >
          <PurchaseLocationOptions
            locations={locations}
            selectedId={selectedLocation?.id ?? null}
            onSelect={(id) => {
              onPurchaseLocationChange(task, id);
              setLocationAnchor(null);
            }}
          />
        </Menu>
      )}

      {/*
        mountOnEnter/unmountOnExit: 中のTextFieldはdefaultValueの
        非制御コンポーネントなので、閉じている間にRealtime等でtask.url/note
        が変わっても古い値のまま残ってしまう。開くたびに再マウントして
        defaultValueを最新化する。
      */}
      <Collapse in={detailsOpen} mountOnEnter unmountOnExit>
        <Stack spacing={1} sx={{ pt: 1, pl: "36px", pr: 1 }}>
          <TextField
            type="url"
            size="small"
            variant="standard"
            placeholder="URL"
            defaultValue={task.url ?? ""}
            onBlur={(event) => onUrlChange(task, event.target.value.trim())}
            slotProps={{
              input: {
                startAdornment: (
                  <LinkIcon
                    fontSize="small"
                    sx={{ color: "text.disabled", mr: 0.5 }}
                  />
                ),
                endAdornment: task.url ? (
                  <IconButton
                    component="a"
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    aria-label="URLを開く"
                  >
                    <OpenInNewIcon fontSize="inherit" />
                  </IconButton>
                ) : undefined,
              },
              htmlInput: { style: { fontSize: "1rem" } },
            }}
          />
          <TextField
            multiline
            minRows={1}
            size="small"
            variant="standard"
            placeholder="メモ"
            defaultValue={task.note ?? ""}
            onBlur={(event) => onNoteChange(task, event.target.value)}
            slotProps={{ htmlInput: { style: { fontSize: "1rem" } } }}
          />
        </Stack>
      </Collapse>
    </Paper>
  );
}
