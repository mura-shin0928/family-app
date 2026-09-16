import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { getChildren } from "@/features/children/queries";
import {
  getAreaPrograms,
  getAreas,
  getProgramCategories,
  isSeidoDataHubConfigured,
} from "@/features/programs/api";
import { MunicipalityRequiredNotice } from "@/features/programs/components/MunicipalityRequiredNotice";
import { ProgramListScreen } from "@/features/programs/components/ProgramListScreen";
import { PROGRAM_CATEGORY_CODES } from "@/features/programs/filter";
import { getFamilyMunicipality } from "@/features/programs/queries";

/**
 * 家族の自治体（＋都道府県）の子育て支援制度を、子の時期で絞って一覧する。
 * 手続き画面とは別ページにして、seido-data-hub を呼ぶのはここを開いたときだけにする。
 */
export default async function ProgramsPage() {
  const { member } = await requireFamilyMember();
  // 未設定の環境では入口を出していないので、URL 直打ちも無いページとして扱う
  if (!isSeidoDataHubConfigured()) notFound();

  const [municipality, familyChildren] = await Promise.all([
    getFamilyMunicipality(member.familyId),
    getChildren(member.familyId),
  ]);

  const [programs, areas, categories] = municipality
    ? await Promise.all([
        getAreaPrograms(municipality.code),
        getAreas(),
        getProgramCategories(PROGRAM_CATEGORY_CODES),
      ])
    : [null, null, null];

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <BackButton fallbackHref="/procedures" />
          <Typography variant="h6" component="h1">
            {municipality ? `${municipality.name}の制度` : "制度を探す"}
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      {!municipality ? (
        <MunicipalityRequiredNotice />
      ) : !programs?.ok || !categories?.ok ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            制度の情報を取得できませんでした。時間をおいて開き直してください。
          </Alert>
        </Box>
      ) : (
        <ProgramListScreen
          programs={programs.data}
          categories={categories.data}
          attribution={programs.attribution}
          areaNames={Object.fromEntries(
            (areas?.ok ? areas.data : []).map((area) => [area.code, area.name]),
          )}
          familyChildren={familyChildren}
        />
      )}
    </Box>
  );
}
