import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";

export default async function RecipesPage() {
  const { member } = await requireFamilyMember();

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" component="h1">
            レシピ
          </Typography>
          <Box component="form" action={signOut}>
            <Button type="submit" color="inherit" size="small">
              {member.displayName} / ログアウト
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />
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
