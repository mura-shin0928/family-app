"use client";

import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import DiningOutlinedIcon from "@mui/icons-material/DiningOutlined";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  // タブに属さないページ（/family等）では、どのタブも選択状態にしない。
  // 前方一致にしているのは、タブ配下のページ（/tasks/settings 等）でも
  // その親タブを点灯させたままにするため。
  const value = pathname.startsWith("/tasks")
    ? "/tasks"
    : pathname.startsWith("/recipes")
      ? "/recipes"
      : pathname.startsWith("/life-events")
        ? "/life-events"
        : false;

  return (
    <Paper
      elevation={1}
      square
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        borderTop: 1,
        borderColor: "divider",
        // 高さを変えるときは lib/layout.ts の定数も直す。
        pb: "env(safe-area-inset-bottom)",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation
        value={value}
        sx={{
          "& .MuiSvgIcon-root": {
            boxSizing: "content-box",
            px: "14px",
            py: "4px",
            borderRadius: 999,
          },
          "& .Mui-selected .MuiSvgIcon-root": {
            bgcolor: "var(--mui-palette-brand-tagBg)",
          },
        }}
      >
        <BottomNavigationAction
          component={Link}
          href="/tasks"
          value="/tasks"
          aria-label="タスク"
          icon={<ChecklistOutlinedIcon />}
        />
        <BottomNavigationAction
          component={Link}
          href="/recipes"
          value="/recipes"
          aria-label="レシピ"
          icon={<DiningOutlinedIcon />}
        />
        <BottomNavigationAction
          component={Link}
          href="/life-events"
          value="/life-events"
          aria-label="ライフイベント"
          icon={<ChildCareIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
}
