import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { BackButton } from "@/components/BackButton";
import { requireFamilyMember } from "@/features/auth/guard";
import { PurchaseLocationsSection } from "@/features/purchase-locations/components/PurchaseLocationsSection";
import { getPurchaseLocations } from "@/features/purchase-locations/queries";

export default async function TasksSettingsPage() {
  const { member } = await requireFamilyMember();
  const locations = await getPurchaseLocations(member.familyId);

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <BackButton fallbackHref="/tasks" />
          <Typography variant="h6" component="h1">
            一覧の設定
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Box sx={{ px: 2, pt: 2 }}>
        <PurchaseLocationsSection locations={locations} />
      </Box>
    </Box>
  );
}
