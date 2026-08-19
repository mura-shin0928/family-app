import Box from "@mui/material/Box";
import { requireFamilyMember } from "@/features/auth/guard";
import { RecipeListScreen } from "@/features/recipes/components/RecipeListScreen";
import { getRecipes } from "@/features/recipes/queries";
import { AppHeader } from "../AppHeader";

export default async function RecipesPage() {
  const { member } = await requireFamilyMember();
  const recipes = await getRecipes(member.familyId);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeader title="レシピ" displayName={member.displayName} />
      <RecipeListScreen initialRecipes={recipes} />
    </Box>
  );
}
