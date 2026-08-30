import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { AppHeaderSkeleton } from "./AppHeaderSkeleton";

/**
 * 自前の loading.tsx を持たない (app) 配下セグメント
 * (family / procedures / recipes/new / tasks/settings ...) 共通のフォールバック。
 * より近い loading.tsx（tasks/loading.tsx など）があればそちらが優先される。
 * 画面名はこの時点で確定しないので AppHeaderSkeleton には title を渡さない。
 */
export default function Loading() {
  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeaderSkeleton />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    </Box>
  );
}
