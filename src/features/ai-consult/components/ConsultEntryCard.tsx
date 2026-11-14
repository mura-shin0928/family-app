"use client";

import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";

const FALLBACK_LINE = "お宮参りや児童手当など、やることを一緒に洗い出します";

/** 探すタブの一番上に出す、AI への相談の入口。検索欄と同じ形で、色は面だけにする。 */
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
        borderRadius: 1,
        // チップと同じ色。CSS 変数なのでライトとダークで切り替わる
        bgcolor: "var(--mui-palette-brand-tagBg)",
        px: 1.5,
        py: 1,
      }}
    >
      <Box
        component="span"
        sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
      >
        <AutoAwesomeOutlinedIcon fontSize="small" color="primary" />
        <Typography variant="body1" component="span">
          AI に相談する
        </Typography>
        <ChevronRightIcon
          fontSize="small"
          sx={{ ml: "auto", color: "text.secondary" }}
        />
      </Box>
      <Typography
        variant="caption"
        component="span"
        noWrap
        sx={{ display: "block", color: "text.secondary" }}
      >
        {line}
      </Typography>
    </ButtonBase>
  );
}
