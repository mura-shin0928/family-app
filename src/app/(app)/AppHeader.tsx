import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "./AccountMenu";

type Props = {
  title: string;
  displayName: string;
  isAppAdmin: boolean;
};

// isAppAdminは呼び出し元のページで他の初期データ取得と並行して解決させる
// （このコンポーネント内でawaitすると、そのページの他のクエリと直列になってしまうため）。
export function AppHeader({ title, displayName, isAppAdmin }: Props) {
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
