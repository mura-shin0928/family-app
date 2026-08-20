import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { LinkIconButton } from "@/components/LinkIconButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { RecipeEditor } from "@/features/recipes/components/RecipeEditor";

// URL/Gemini解析（analyzeRecipeSource）・画像解析（analyzeRecipeImage）はこのページの
// Server Actionのため、ページ単位で延長する。画像は入力トークンが多くテキストより
// レイテンシが伸びる想定のため60秒に広げる（Hobbyプランの上限300秒に対して余裕あり）。
export const maxDuration = 60;

export default async function NewRecipePage() {
  await requireFamilyMember();

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <LinkIconButton
            href="/recipes"
            edge="start"
            size="small"
            sx={{ mr: 1 }}
            aria-label="戻る"
          >
            <ArrowBackIcon fontSize="small" />
          </LinkIconButton>
          <Typography variant="h6" component="h1">
            新しいレシピ
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <RecipeEditor mode="create" />
    </Box>
  );
}
