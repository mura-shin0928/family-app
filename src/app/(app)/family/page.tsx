import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { BackButton } from "@/components/BackButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { InvitationsScreen } from "@/features/invitations/components/InvitationsScreen";
import {
  getFamily,
  getFamilyMembers,
  getInvitations,
} from "@/features/invitations/queries";

export default async function FamilyPage() {
  const { member } = await requireFamilyMember();
  const [family, members, invitations] = await Promise.all([
    getFamily(member.familyId),
    getFamilyMembers(member.familyId),
    getInvitations(member.familyId),
  ]);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <BackButton fallbackHref="/" />
          <Typography variant="h6" component="h1">
            {family.name}
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <InvitationsScreen
        members={members}
        invitations={invitations}
        currentMemberId={member.id}
      />
    </Box>
  );
}
