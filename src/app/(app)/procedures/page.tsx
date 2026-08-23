import Box from "@mui/material/Box";
import { getIsAppAdmin, requireFamilyMember } from "@/features/auth/guard";
import { getChildren } from "@/features/children/queries";
import { ensureBirthTemplate } from "@/features/procedures/actions";
import { ProcedureChecklistScreen } from "@/features/procedures/components/ProcedureChecklistScreen";
import {
  getBirthTemplateWithItems,
  getFamilyMunicipalityCode,
  getFamilyProcedureLinks,
  getProceduresByCategories,
} from "@/features/procedures/queries";
import type { ProcedureCategory } from "@/features/procedures/types";
import { AppHeader } from "../AppHeader";

// ItemProcedureSearch経由のdiscover/ingestはここから起動されるため、
// AddProcedureScreen時代と同じ予算(60秒)を確保する。
export const maxDuration = 60;

export default async function ProceduresPage() {
  const { member } = await requireFamilyMember();

  const ensured = await ensureBirthTemplate();
  if (!ensured.ok) {
    throw new Error(ensured.error);
  }

  const [templateData, familyChildren, municipalityCode, isAppAdmin] =
    await Promise.all([
      getBirthTemplateWithItems(member.familyId),
      getChildren(member.familyId),
      getFamilyMunicipalityCode(member.familyId),
      getIsAppAdmin(),
    ]);

  if (!templateData) {
    throw new Error("failed to load the birth template after ensuring it");
  }

  const categories = Array.from(
    new Set(
      templateData.items
        .map((item) => item.category)
        .filter((category): category is ProcedureCategory => category !== null),
    ),
  );

  const [procedures, links] = await Promise.all([
    getProceduresByCategories(categories),
    getFamilyProcedureLinks(member.familyId),
  ]);

  const linkedTaskIdByKey: Record<string, string> = {};
  for (const link of links) {
    if (!link.taskId) continue;
    linkedTaskIdByKey[`${link.templateItemId}:${link.childId ?? ""}`] =
      link.taskId;
  }

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
      <ProcedureChecklistScreen
        template={templateData.template}
        items={templateData.items}
        familyChildren={familyChildren}
        procedures={procedures}
        linkedTaskIdByKey={linkedTaskIdByKey}
        municipalityCode={municipalityCode}
        areaCode={municipalityCode ?? ""}
      />
    </Box>
  );
}
