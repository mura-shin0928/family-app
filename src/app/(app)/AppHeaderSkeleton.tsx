import AppBar from "@mui/material/AppBar";
import Skeleton from "@mui/material/Skeleton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

/**
 * AppHeader と同じ高さ・形の loading.tsx 用プレースホルダ。
 * displayName はサーバーの認証応答が返るまで分からないため取得しないが、
 * AppBar/Toolbar の寸法を一致させ、本物のヘッダーに差し替わる際の
 * レイアウトシフト（高さのガタつき）を防ぐ。
 *
 * title は画面名が分かる境界（例: tasks/loading.tsx）でのみ渡す。
 * (app)/loading.tsx のような汎用フォールバックでは画面名が
 * サーバー応答前に確定しないため省略し、タイトル部分もスケルトンで埋める。
 */
export function AppHeaderSkeleton({ title }: { title?: string }) {
  return (
    <>
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {title ? (
            <Typography variant="h6" component="h1">
              {title}
            </Typography>
          ) : (
            <Skeleton variant="text" width={120} height={32} />
          )}
          <Skeleton variant="text" width={96} height={32} />
        </Toolbar>
      </AppBar>
      <Toolbar />
    </>
  );
}
