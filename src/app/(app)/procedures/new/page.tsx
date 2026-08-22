import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { LinkIconButton } from "@/components/LinkIconButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { AddProcedureScreen } from "@/features/procedures/components/AddProcedureScreen";

// discoverは候補ページを1req/秒で最大20件フェッチする（§6.4）ため60秒を確保する。
// ingestは1件ずつ呼ばれるため実際の所要はもっと短い（内部の予算は28秒）。
export const maxDuration = 60;

// /procedures の一覧画面はまだ無い（P3で追加予定）ため、いったんホームへ戻す。
export default async function NewProcedurePage() {
  await requireFamilyMember();

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <LinkIconButton
            href="/"
            edge="start"
            size="small"
            sx={{ mr: 1 }}
            aria-label="戻る"
          >
            <ArrowBackIcon fontSize="small" />
          </LinkIconButton>
          <Typography variant="h6" component="h1">
            手続きを追加
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <AddProcedureScreen />
    </Box>
  );
}
