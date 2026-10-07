"use client";

import Alert from "@mui/material/Alert";
import Snackbar, { type SnackbarProps } from "@mui/material/Snackbar";
import { type ReactNode, useState } from "react";
import type { ResultToast } from "@/lib/result-toast";

/**
 * 操作の成功・失敗を知らせるスナックバー。色枠とアイコンで結果を見分けられるようにする。
 * toast が null になっても、閉じるアニメーションの間は直前の中身を出し続ける。
 */
export function ResultSnackbar({
  toast,
  action,
  ...snackbarProps
}: {
  toast: ResultToast | null;
  action?: ReactNode;
} & Pick<
  SnackbarProps,
  "onClose" | "autoHideDuration" | "anchorOrigin" | "sx"
>) {
  const [shown, setShown] = useState(toast);
  if (
    toast &&
    (toast.severity !== shown?.severity || toast.message !== shown?.message)
  ) {
    setShown(toast);
  }

  return (
    <Snackbar open={!!toast} {...snackbarProps}>
      <Alert
        severity={shown?.severity}
        role={shown?.severity === "error" ? "alert" : "status"}
        action={action}
        sx={{ width: "100%", alignItems: "center", boxShadow: 3 }}
      >
        {shown?.message}
      </Alert>
    </Snackbar>
  );
}
