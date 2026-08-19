import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireFamilyMember } from "@/features/auth/guard";
import { AppHeader } from "../AppHeader";

export default async function RecipesPage() {
  const { member } = await requireFamilyMember();

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeader title="レシピ" displayName={member.displayName} />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pb: "calc(56px + env(safe-area-inset-bottom))",
        }}
      >
        <Typography color="text.secondary">レシピはまだありません</Typography>
      </Box>
    </Box>
  );
}
