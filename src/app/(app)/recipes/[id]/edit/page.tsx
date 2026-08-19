import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { LinkIconButton } from "@/components/LinkIconButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { RecipeEditor } from "@/features/recipes/components/RecipeEditor";
import { getRecipe } from "@/features/recipes/queries";

// URL/Gemini解析（analyzeRecipeSource）はこのページのServer Actionのため、ページ単位で延長する。
export const maxDuration = 30;

export default async function EditRecipePage({
  params,
}: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  const { member } = await requireFamilyMember();
  const recipe = await getRecipe(member.familyId, id);

  if (!recipe) notFound();

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <LinkIconButton
            href={`/recipes/${id}`}
            edge="start"
            size="small"
            sx={{ mr: 1 }}
            aria-label="戻る"
          >
            <ArrowBackIcon fontSize="small" />
          </LinkIconButton>
          <Typography variant="h6" component="h1" noWrap sx={{ flex: 1 }}>
            レシピを編集
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <RecipeEditor mode="edit" recipe={recipe} />
    </Box>
  );
}
