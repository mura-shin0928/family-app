"use client";

import IconButton from "@mui/material/IconButton";
import type { SxProps, Theme } from "@mui/material/styles";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * next/link を component として渡す MUI パターンは Client Component 越しでしか
 * 使えない（Server Component から component={Link} を直接渡すと、関数参照を
 * Client Componentへ渡すことになりRSCの境界でエラーになる）ため、
 * Server Component側から使うにはこの薄いラッパーを挟む。
 */
export function LinkIconButton({
  href,
  "aria-label": ariaLabel,
  size,
  edge,
  sx,
  children,
}: {
  href: string;
  "aria-label": string;
  size?: "small" | "medium" | "large";
  edge?: "start" | "end" | false;
  sx?: SxProps<Theme>;
  children: ReactNode;
}) {
  return (
    <IconButton
      component={Link}
      href={href}
      size={size}
      edge={edge}
      sx={sx}
      aria-label={ariaLabel}
    >
      {children}
    </IconButton>
  );
}
