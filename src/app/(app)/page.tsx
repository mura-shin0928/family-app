import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import Box from "@mui/material/Box";
import { LinkIconButton } from "@/components/LinkIconButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { TaskListScreen } from "@/features/tasks/components/TaskListScreen";
import { getTasks } from "@/features/tasks/queries";
import { AppHeader } from "./AppHeader";

export default async function HomePage() {
  const { member } = await requireFamilyMember();
  const tasks = await getTasks(member.familyId);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeader
        title="一覧"
        displayName={member.displayName}
        actions={
          <LinkIconButton href="/family" size="small" aria-label="Family">
            <GroupOutlinedIcon fontSize="small" />
          </LinkIconButton>
        }
      />
      <TaskListScreen initialTasks={tasks} familyId={member.familyId} />
    </Box>
  );
}
