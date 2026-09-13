"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "next/link";

/**
 * 自治体が未設定のときの案内。Button に next/link を渡すので Client Component に置く
 * （Server Component からは関数を props に渡せない）。
 */
export function MunicipalityRequiredNotice() {
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
        「家族」画面で住んでいる自治体を選ぶと、その自治体と都道府県の子育て支援制度が一覧できます。
      </Alert>
    </Box>
  );
}
