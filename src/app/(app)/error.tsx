"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { captureClientException } from "@/lib/analytics/client";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    captureClientException(error);
  }, [error]);

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 4,
      }}
    >
      <Typography variant="h6" component="h1">
        問題が起きました
      </Typography>
      <Typography variant="body1" color="textSecondary">
        時間をおいて、もう一度お試しください。
      </Typography>
      <Button variant="contained" onClick={() => retry()}>
        再読み込み
      </Button>
    </Box>
  );
}
