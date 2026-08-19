import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { LinkIconButton } from "@/components/LinkIconButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { InvitationsScreen } from "@/features/invitations/components/InvitationsScreen";
import {
  getFamilyMembers,
  getInvitations,
} from "@/features/invitations/queries";

export default async function FamilyPage() {
  const { member } = await requireFamilyMember();
  const [members, invitations] = await Promise.all([
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
          <LinkIconButton
            href="/"
            edge="start"
            size="small"
            sx={{ mr: 1 }}
            aria-label="戻る"
          >
            <ArrowBackIcon fontSize="small" />
          </LinkIconButton>
          <Typography variant="h6" component="h1">
            Family
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <InvitationsScreen members={members} invitations={invitations} />
    </Box>
  );
}
