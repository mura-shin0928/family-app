"use client";

import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const value = pathname.startsWith("/recipes") ? "/recipes" : "/";

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
        pb: "env(safe-area-inset-bottom)",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation value={value} showLabels>
        <BottomNavigationAction
          component={Link}
          href="/"
          value="/"
          label="一覧"
          icon={<ChecklistOutlinedIcon />}
        />
        <BottomNavigationAction
          component={Link}
          href="/recipes"
          value="/recipes"
          label="レシピ"
          icon={<MenuBookOutlinedIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
}
