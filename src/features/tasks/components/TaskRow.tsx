"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { formatRelativeDue } from "@/lib/date";
import type { TaskDTO } from "../types";

type Props = {
  task: TaskDTO;
  today: string;
  onToggle: (task: TaskDTO) => void;
  onDueDateChange: (task: TaskDTO, dueOn: string | null) => void;
  onTitleChange: (task: TaskDTO, title: string) => void;
  onPurchaseToggle: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
};

export function TaskRow({
  task,
  today,
  onToggle,
  onDueDateChange,
  onTitleChange,
  onPurchaseToggle,
  onDelete,
}: Props) {
  const [editingDue, setEditingDue] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const done = task.status === "done";

  function commitTitle(value: string) {
    const trimmed = value.trim();
    setEditingTitle(false);
    if (trimmed && trimmed !== task.title) {
      onTitleChange(task, trimmed);
    }
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1,
        py: 0.5,
      }}
    >
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
            slotProps={{ htmlInput: { style: { fontSize: "0.875rem" } } }}
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

        {editingDue ? (
          <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              type="date"
              size="small"
              variant="standard"
              autoFocus
              defaultValue={task.dueOn ?? ""}
              onBlur={() => setEditingDue(false)}
              onChange={(event) => {
                onDueDateChange(task, event.target.value || null);
                setEditingDue(false);
              }}
              slotProps={{ htmlInput: { style: { fontSize: "0.75rem" } } }}
            />
            {task.dueOn && (
              <Button
                size="small"
                sx={{
                  p: 0,
                  minWidth: 0,
                  textTransform: "none",
                  fontSize: "0.75rem",
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onDueDateChange(task, null);
                  setEditingDue(false);
                }}
              >
                期限なしにする
              </Button>
            )}
          </Box>
        ) : (
          <Button
            size="small"
            onClick={() => setEditingDue(true)}
            sx={{
              mt: 0.25,
              p: 0,
              minWidth: 0,
              textTransform: "none",
              fontSize: "0.75rem",
              color: "text.secondary",
            }}
          >
            {task.dueOn ? formatRelativeDue(task.dueOn, today) : "期限を設定"}
          </Button>
        )}
      </Box>

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
    </Paper>
  );
}
