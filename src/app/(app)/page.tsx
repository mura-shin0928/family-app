import Box from "@mui/material/Box";
import { getIsAppAdmin, requireFamilyMember } from "@/features/auth/guard";
import { TaskListScreen } from "@/features/tasks/components/TaskListScreen";
import { getTasks } from "@/features/tasks/queries";
import { AppHeader } from "./AppHeader";

export default async function HomePage() {
  const { member } = await requireFamilyMember();
  // 互いに依存しないため並行して取得し、往復レイテンシを重ねない。
  const [tasks, isAppAdmin] = await Promise.all([
    getTasks(member.familyId),
    getIsAppAdmin(),
  ]);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeader
        title="一覧"
        displayName={member.displayName}
        isAppAdmin={isAppAdmin}
      />
      <TaskListScreen initialTasks={tasks} familyId={member.familyId} />
    </Box>
  );
}
