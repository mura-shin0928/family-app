import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { LinkIconButton } from "@/components/LinkIconButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { RecipeDetailScreen } from "@/features/recipes/components/RecipeDetailScreen";
import { getRecipe } from "@/features/recipes/queries";

export default async function RecipeDetailPage({
  params,
}: PageProps<"/recipes/[id]">) {
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
            href="/recipes"
            edge="start"
            size="small"
            sx={{ mr: 1 }}
            aria-label="戻る"
          >
            <ArrowBackIcon fontSize="small" />
          </LinkIconButton>
          <Typography variant="h6" component="h1" noWrap sx={{ flex: 1 }}>
            {recipe.title}
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <RecipeDetailScreen initialRecipe={recipe} />
    </Box>
  );
}
