"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Dispatch, SetStateAction } from "react";
import type { IngredientRow } from "../form-values";

/** 材料行の一覧と、行の追加・書き換え・削除。 */
export function IngredientRowsEditor({
  rows,
  setRows,
}: {
  rows: IngredientRow[];
  setRows: Dispatch<SetStateAction<IngredientRow[]>>;
}) {
  function addRow() {
    setRows((current) => [
      ...current,
      { key: crypto.randomUUID(), name: "", quantity: "" },
    ]);
  }

  function updateRow(key: string, field: "name" | "quantity", value: string) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <Box component="section">
      <Stack spacing={1.5}>
        {rows.map((row) => (
          <Stack
            key={row.key}
            direction="row"
            spacing={1}
            sx={{ alignItems: "center" }}
          >
            <TextField
              label="材料名"
              value={row.name}
              onChange={(event) =>
                updateRow(row.key, "name", event.target.value)
              }
              sx={{ flex: 1, minWidth: 0 }}
            />
            <TextField
              label="分量"
              value={row.quantity}
              onChange={(event) =>
                updateRow(row.key, "quantity", event.target.value)
              }
              sx={{ width: 104, flexShrink: 0 }}
            />
            <IconButton
              onClick={() => removeRow(row.key)}
              aria-label="材料を削除"
              sx={{ flexShrink: 0 }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button
        onClick={addRow}
        startIcon={<AddIcon fontSize="small" />}
        sx={{ mt: 1.5 }}
      >
        材料を追加
      </Button>
    </Box>
  );
}
