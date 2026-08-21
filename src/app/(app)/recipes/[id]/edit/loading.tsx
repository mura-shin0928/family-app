import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { AppHeaderSkeleton } from "../../../AppHeaderSkeleton";

export default function Loading() {
  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <AppHeaderSkeleton title="レシピを編集" />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    </Box>
  );
}
