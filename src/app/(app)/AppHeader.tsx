import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  title: string;
  displayName: string;
};

export function AppHeader({ title, displayName }: Props) {
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <>
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" component="h1">
            {title}
          </Typography>
          <Box component="form" action={signOut}>
            <Button type="submit" color="inherit" size="small">
              {displayName} / ログアウト
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />
    </>
  );
}
