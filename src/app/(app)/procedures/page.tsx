import Box from "@mui/material/Box";
import { getIsAppAdmin, requireFamilyMember } from "@/features/auth/guard";
import { getChildren } from "@/features/children/queries";
import { LifeEventListScreen } from "@/features/life-events/components/LifeEventListScreen";
import {
  getLifeEventProcedures,
  getLifeEvents,
} from "@/features/life-events/queries";
import { isSeidoDataHubConfigured } from "@/features/programs/api";
import { AppHeader } from "../AppHeader";

export default async function ProceduresPage() {
  const { member } = await requireFamilyMember();

  const [lifeEvents, procedures, familyChildren, isAppAdmin] =
    await Promise.all([
      getLifeEvents(member.familyId),
      getLifeEventProcedures(member.familyId),
      getChildren(member.familyId),
      getIsAppAdmin(),
    ]);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeader
        title="手続き"
        displayName={member.displayName}
        isAppAdmin={isAppAdmin}
      />
      <LifeEventListScreen
        lifeEvents={lifeEvents}
        procedures={procedures}
        familyChildren={familyChildren}
        showProgramsLink={isSeidoDataHubConfigured()}
      />
    </Box>
  );
}
