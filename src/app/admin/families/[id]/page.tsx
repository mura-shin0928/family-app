import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import {
  createAdminInvitation,
  deleteAdminInvitation,
  removeAdminMember,
  revokeAdminInvitation,
  setFamilyRecipeAnalysisDailyLimit,
} from "@/features/admin/actions";
import { RecipeAnalysisLimitForm } from "@/features/admin/components/RecipeAnalysisLimitForm";
import { getFamilyRecipeAnalysisDailyLimit } from "@/features/admin/queries";
import { getFamily, getFamilyMembers } from "@/features/family/queries";
import { InvitationsScreen } from "@/features/invitations/components/InvitationsScreen";
import { getInvitations } from "@/features/invitations/queries";

export default async function AdminFamilyDetailPage({
  params,
}: PageProps<"/admin/families/[id]">) {
  const { id } = await params;

  let family: Awaited<ReturnType<typeof getFamily>>;
  try {
    family = await getFamily(id);
  } catch {
    notFound();
  }

  const [members, invitations, recipeAnalysisDailyLimit] = await Promise.all([
    getFamilyMembers(id),
    getInvitations(id),
    getFamilyRecipeAnalysisDailyLimit(id),
  ]);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <BackButton fallbackHref="/admin" />
          <Typography variant="h6" component="h1">
            {family.name}
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <RecipeAnalysisLimitForm
        dailyLimit={recipeAnalysisDailyLimit}
        setDailyLimit={setFamilyRecipeAnalysisDailyLimit.bind(null, id)}
      />
      <InvitationsScreen
        members={members}
        invitations={invitations}
        currentMemberId={null}
        createInvitation={createAdminInvitation.bind(null, id)}
        revokeInvitation={revokeAdminInvitation.bind(null, id)}
        deleteInvitation={deleteAdminInvitation.bind(null, id)}
        removeMember={removeAdminMember.bind(null, id)}
      />
    </Box>
  );
}
