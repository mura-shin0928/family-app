import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { BackButton } from "@/components/BackButton";
import { createFamily } from "@/features/admin/actions";
import { listFamiliesForAdmin } from "@/features/admin/queries";
import { AdminFamilyListScreen } from "./AdminFamilyListScreen";

export default async function AdminPage() {
  const families = await listFamiliesForAdmin();

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <BackButton fallbackHref="/" />
          <Typography variant="h6" component="h1">
            Admin
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <AdminFamilyListScreen families={families} createFamily={createFamily} />
    </Box>
  );
}
