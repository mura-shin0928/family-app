import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { getIsAppAdmin } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "./AccountMenu";

type Props = {
  title: string;
  displayName: string;
};

export async function AppHeader({ title, displayName }: Props) {
  const isAppAdmin = await getIsAppAdmin();

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
          <AccountMenu
            displayName={displayName}
            isAppAdmin={isAppAdmin}
            signOut={signOut}
          />
        </Toolbar>
      </AppBar>
      <Toolbar />
    </>
  );
}
