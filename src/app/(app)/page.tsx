import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { requireFamilyMember } from "@/features/auth/guard";
import { TaskListScreen } from "@/features/tasks/components/TaskListScreen";
import { getTasks } from "@/features/tasks/queries";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const { member } = await requireFamilyMember();
  const tasks = await getTasks(member.familyId);

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
            一覧
          </Typography>
          <Box component="form" action={signOut}>
            <Button type="submit" color="inherit" size="small">
              {member.displayName} / ログアウト
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <TaskListScreen initialTasks={tasks} />
    </Box>
  );
}
