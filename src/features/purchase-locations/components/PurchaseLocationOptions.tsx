"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import type { PurchaseLocation } from "../types";

/**
 * 買う場所の選択肢。行の場所ピッカー（TaskRow の Menu）と
 * QuickCaptureBar の場所パネルで共有する。0件の分岐をここ1箇所に閉じる。
 *
 * すべての要素を <li>（MenuItem か Box component="li"）で返すので、
 * 呼び出し側は <ul>（MUI の Menu / MenuList）の中に置くこと。
 */
export function PurchaseLocationOptions({
  locations,
  selectedId,
  onSelect,
}: {
  locations: PurchaseLocation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (locations.length === 0) {
    return (
      <Box component="li" sx={{ px: 2, py: 1.5, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          買う場所がまだ登録されていません
        </Typography>
        <Button
          component={Link}
          href="/tasks/settings"
          size="small"
          variant="outlined"
        >
          設定で登録する
        </Button>
      </Box>
    );
  }

  return (
    <>
      <MenuItem selected={selectedId === null} onClick={() => onSelect(null)}>
        未設定
      </MenuItem>
      {locations.map((location) => (
        <MenuItem
          key={location.id}
          selected={selectedId === location.id}
          onClick={() => onSelect(location.id)}
        >
          {location.name}
        </MenuItem>
      ))}
    </>
  );
}
