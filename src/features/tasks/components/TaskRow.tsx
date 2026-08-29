"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import LinkIcon from "@mui/icons-material/Link";
import NotesIcon from "@mui/icons-material/Notes";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
        py: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Checkbox
          checked={done}
          onChange={() => onToggle(task)}
          color="success"
          aria-label={done ? "未完了に戻す" : "完了にする"}
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

          {/*
            iOSではネイティブdateピッカー操作時に、他ボタンへのタップより先に
            onBlurが発火しeditingDueがfalseになってボタンごと消えてしまう
            （「期限なしにする」が反応しない不具合の原因だった）。QuickCaptureBar
            の期限パネルと同様、blurではなくClickAwayListenerで閉じる。
          */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <ClickAwayListener onClickAway={() => setEditingDue(false)}>
              <Box>
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
                    sx={{
                      mt: 0.25,
                      p: 0,
                      minWidth: 0,
                      textTransform: "none",
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    {task.dueOn
                      ? formatRelativeDue(task.dueOn, today)
                      : "期限を設定"}
                  </Button>
                )}
              </Box>
            </ClickAwayListener>

            {task.isPurchase && (
              <Button
                size="small"
                onClick={(event) => setLocationAnchor(event.currentTarget)}
                sx={{
                  mt: 0.25,
                  p: 0,
                  minWidth: 0,
                  textTransform: "none",
                  fontSize: "0.75rem",
                  color: selectedLocation ? "primary.main" : "text.secondary",
                }}
              >
                {selectedLocation ? selectedLocation.name : "場所"}
              </Button>
            )}
          </Box>
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
        mountOnEnter/unmountOnExit: 中のTextFieldはdefaultValueの
        非制御コンポーネントなので、閉じている間にRealtime等でtask.url/note
        が変わっても古い値のまま残ってしまう。開くたびに再マウントして
        defaultValueを最新化する。
      */}
      <Collapse in={detailsOpen} mountOnEnter unmountOnExit>
        <Stack spacing={1} sx={{ pt: 1, pl: "calc(42px + 12px)", pr: 1 }}>
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
