"use client";

import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Child } from "@/features/children/types";
import { addLifeEvent } from "../actions";
import { LIFE_EVENT_TEMPLATES } from "../default-templates";
import type { LifeEvent, LifeEventProcedure } from "../types";

/**
 * 家族の手続きリスト。ライフイベントごとのセクションには分けず、family単位で
 * 1本のリストとして並べる（イベントをまたいだ並べ替えはP6-2、誰が決めたか・
 * 時期の表示はP6-3で足す）。
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
  const [dialogOpen, setDialogOpen] = useState(false);

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

        {procedures.length === 0 ? (
          <Alert severity="info">
            ライフイベントを追加すると、そのイベントでやることがここに並びます。追加したあとは自由に書き換えられます。
          </Alert>
        ) : (
          <Paper variant="outlined">
            <List disablePadding>
              {procedures.map((procedure) => (
                <ListItem key={procedure.id} divider>
                  <ListItemText
                    primary={procedure.title}
                    secondary={procedure.note}
                    slotProps={{
                      primary: { variant: "subtitle2" },
                      secondary: { variant: "caption" },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Stack>

      <AddLifeEventDialog
        open={dialogOpen}
        familyChildren={familyChildren}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
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
