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
      : pathname.startsWith("/procedures")
        ? "/procedures"
        : false;

  return (
    <Paper
      elevation={3}
      square
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        borderTop: 1,
        borderColor: "divider",
        // ここで足すセーフエリアと、BottomNavigation の既定の高さ(56px)の合計が
        // このナビの高さになる。各画面はその高さを lib/layout.ts の定数で参照して
        // 下に潜らないようにしているので、高さを変えるときはそちらも直すこと。
        pb: "env(safe-area-inset-bottom)",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation value={value}>
        <BottomNavigationAction
          component={Link}
          href="/tasks"
          value="/tasks"
          aria-label="一覧"
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
          href="/procedures"
          value="/procedures"
          aria-label="手続き"
          icon={<ChildCareIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
}
