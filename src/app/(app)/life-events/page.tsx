import Box from "@mui/material/Box";
import { getIsAppAdmin, requireFamilyMember } from "@/features/auth/guard";
import { getChildren } from "@/features/children/queries";
import { isEventPrepConfigured } from "@/features/event-prep/gemini";
import { LifeEventsScreen } from "@/features/life-events/components/LifeEventsScreen";
import { getLifeEventItems } from "@/features/life-events/item-queries";
import { isSeidoDataHubConfigured } from "@/features/programs/api";
import { AppHeader } from "../AppHeader";

// 準備の提案（Gemini ＋検索）の Server Action が数十秒かかる
export const maxDuration = 60;

export default async function LifeEventsPage() {
  const { member } = await requireFamilyMember();

  const [familyChildren, items, isAppAdmin] = await Promise.all([
    getChildren(member.familyId),
    getLifeEventItems(member.familyId),
    getIsAppAdmin(),
  ]);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeader
        title="ライフイベント"
        displayName={member.displayName}
        isAppAdmin={isAppAdmin}
      />
      <LifeEventsScreen
        familyChildren={familyChildren}
        items={items}
        showPrograms={isSeidoDataHubConfigured()}
        showEventPrep={isEventPrepConfigured()}
      />
    </Box>
  );
}
