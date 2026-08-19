"use client";

import Button from "@mui/material/Button";
import type { SxProps, Theme } from "@mui/material/styles";
import Link from "next/link";
import type { ReactNode } from "react";

/** LinkIconButton と同じ理由（RSC境界）で、Button版が必要な箇所向けのラッパー。 */
export function LinkButton({
  href,
  variant,
  sx,
  children,
}: {
  href: string;
  variant?: "text" | "outlined" | "contained";
  sx?: SxProps<Theme>;
  children: ReactNode;
}) {
  return (
    <Button component={Link} href={href} variant={variant} sx={sx}>
      {children}
    </Button>
  );
}
