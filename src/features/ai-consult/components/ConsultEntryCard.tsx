"use client";

import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";

const FALLBACK_LINE = "お宮参りや児童手当など、やることを一緒に洗い出します";

/** 探すタブの一番上に出す、AI への相談の入口。 */
export function ConsultEntryCard({
  currentTitles,
  onOpen,
}: {
  currentTitles: string[];
  onOpen: () => void;
}) {
  const line =
    currentTitles.length > 0
      ? `いまの時期: ${currentTitles.join("・")}`
      : FALLBACK_LINE;

  return (
    <ButtonBase
      onClick={onOpen}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: 2,
        borderColor: "primary.main",
        borderRadius: 3,
        px: 1.5,
        py: 1.25,
      }}
    >
      <Box
        component="span"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          color: "primary.main",
        }}
      >
        <AutoAwesomeOutlinedIcon fontSize="small" />
        <Typography
          variant="subtitle1"
          component="span"
          sx={{ fontWeight: 700 }}
        >
          やることを AI に相談する
        </Typography>
        <ChevronRightIcon sx={{ ml: "auto" }} />
      </Box>
      <Typography
        variant="caption"
        component="span"
        sx={{ display: "block", color: "text.secondary", mt: 0.25 }}
      >
        {line}
      </Typography>
    </ButtonBase>
  );
}
