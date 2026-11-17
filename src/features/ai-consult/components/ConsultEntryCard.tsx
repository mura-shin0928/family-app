"use client";

import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";

/**
 * AI への相談の入口。探すタブの一番上と、検索中の検索欄の下で同じ見た目にする。
 * 検索欄と同じ角丸で、色はチップと同じ面だけ。
 */
export function ConsultEntryCard({
  label,
  line,
  wrapLabel = false,
  onOpen,
}: {
  label: string;
  /** 2行目。無ければ1行。 */
  line?: string;
  /** label を2行まで折り返す。項目名入りの長い文言で、末尾の大事な言葉が切れないようにする。 */
  wrapLabel?: boolean;
  onOpen: () => void;
}) {
  return (
    <ButtonBase
      onClick={onOpen}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        borderRadius: "12px",
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
        <AutoAwesomeOutlinedIcon
          fontSize="small"
          color="primary"
          sx={{ flexShrink: 0 }}
        />
        {/* flex の子は既定で縮まないので、minWidth: 0 にして長い文言を末尾の「…」で切る */}
        <Typography
          variant="body1"
          component="span"
          noWrap={!wrapLabel}
          sx={{
            minWidth: 0,
            ...(wrapLabel && {
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }),
          }}
        >
          {label}
        </Typography>
        <ChevronRightIcon
          fontSize="small"
          sx={{ ml: "auto", flexShrink: 0, color: "text.secondary" }}
        />
      </Box>
      {line && (
        <Typography
          variant="caption"
          component="span"
          noWrap
          sx={{ display: "block", color: "text.secondary" }}
        >
          {line}
        </Typography>
      )}
    </ButtonBase>
  );
}
