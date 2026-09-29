import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/** 一覧が空のときの案内。線画は currentColor で描くので、文字色に合わせて色が付く。 */
export function EmptyState({
  illustration,
  children,
  py = 8,
}: {
  illustration: ReactNode;
  children: ReactNode;
  py?: number;
}) {
  return (
    <Stack
      spacing={2}
      sx={{ alignItems: "center", py, px: 2, color: "text.secondary" }}
    >
      {illustration}
      <Typography variant="body1" align="center">
        {children}
      </Typography>
    </Stack>
  );
}

type IllustrationProps = { size?: number };

function Svg({
  size = 72,
  children,
}: IllustrationProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** 湯気の立つ鍋（レシピ） */
export function PotIllustration(props: IllustrationProps) {
  return (
    <Svg {...props}>
      <path d="M14 30h44v10a16 16 0 0 1-16 16H30a16 16 0 0 1-16-16V30Z" />
      <path d="M10 30h52M22 20c0-4 4-4 4-8M36 20c0-4 4-4 4-8M50 20c0-4 4-4 4-8" />
    </Svg>
  );
}

/** 書類とチェック（手続き） */
export function PaperIllustration(props: IllustrationProps) {
  return (
    <Svg {...props}>
      <path d="M18 10h26l12 12v40H18V10Z" />
      <path d="M44 10v12h12M26 36h22M26 46h14" />
    </Svg>
  );
}
