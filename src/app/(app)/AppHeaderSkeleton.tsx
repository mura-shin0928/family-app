import AppBar from "@mui/material/AppBar";
import Skeleton from "@mui/material/Skeleton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

/**
 * AppHeader と同じ高さ・形の loading.tsx 用プレースホルダ。
 * displayName はサーバーの認証応答が返るまで分からないため取得しないが、
 * AppBar/Toolbar の寸法を一致させ、本物のヘッダーに差し替わる際の
 * レイアウトシフト（高さのガタつき）を防ぐ。
 */
export function AppHeaderSkeleton({ title }: { title: string }) {
  return (
    <>
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" component="h1">
            {title}
          </Typography>
          <Skeleton variant="text" width={96} height={32} />
        </Toolbar>
      </AppBar>
      <Toolbar />
    </>
  );
}
