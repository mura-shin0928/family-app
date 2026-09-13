import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { BackButton } from "@/components/BackButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { ChildrenSection } from "@/features/children/components/ChildrenSection";
import { getChildren } from "@/features/children/queries";
import {
  createInvitation,
  deleteInvitation,
  removeMember,
  revokeInvitation,
} from "@/features/invitations/actions";
import { InvitationsScreen } from "@/features/invitations/components/InvitationsScreen";
import {
  getFamily,
  getFamilyMembers,
  getInvitations,
} from "@/features/invitations/queries";
import { getAreas } from "@/features/programs/api";
import { MunicipalitySection } from "@/features/programs/components/MunicipalitySection";
import { getFamilyMunicipality } from "@/features/programs/queries";

export default async function FamilyPage() {
  const { member } = await requireFamilyMember();
  const [family, members, invitations, familyChildren, municipality, areas] =
    await Promise.all([
      getFamily(member.familyId),
      getFamilyMembers(member.familyId),
      getInvitations(member.familyId),
      getChildren(member.familyId),
      getFamilyMunicipality(member.familyId),
      getAreas(),
    ]);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <BackButton fallbackHref="/tasks" />
          <Typography variant="h6" component="h1">
            {family.name}
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Box sx={{ px: 2, pt: 2 }}>
        <ChildrenSection familyChildren={familyChildren} />
      </Box>
      <Divider sx={{ mt: 2 }} />
      <Box sx={{ px: 2, pt: 2 }}>
        <MunicipalitySection
          municipality={municipality}
          // 選べるのは市区町村だけ（都道府県の制度は市区町村に付いてくる）
          areas={
            areas.ok
              ? areas.data.filter((area) => area.parentCode !== null)
              : null
          }
        />
      </Box>
      <Divider sx={{ mt: 2 }} />
      <InvitationsScreen
        members={members}
        invitations={invitations}
        currentMemberId={member.id}
        createInvitation={createInvitation}
        revokeInvitation={revokeInvitation}
        deleteInvitation={deleteInvitation}
        removeMember={removeMember}
      />
    </Box>
  );
}
