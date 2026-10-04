"use client";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { MouseEvent } from "react";
import type { InvitationListStatus } from "../status";
import { InvitationStatusChip } from "./InvitationStatusChip";

/** メンバー一覧の1行。名前・メール・状態と、操作メニューを開くボタン。 */
export function MemberRowCard({
  displayName,
  email,
  status,
  menuLabel,
  menuHidden = false,
  onMenuOpen,
}: {
  displayName: string;
  email: string;
  status: InvitationListStatus;
  menuLabel: string;
  // 操作できない行でも、ほかの行と状態チップの位置が揃うよう場所は空けておく。
  menuHidden?: boolean;
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            color="textSecondary"
            noWrap
            component="div"
          >
            {email}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", flexShrink: 0 }}
        >
          <InvitationStatusChip status={status} />
          <IconButton
            size="small"
            aria-label={menuLabel}
            onClick={onMenuOpen}
            sx={menuHidden ? { visibility: "hidden" } : undefined}
            tabIndex={menuHidden ? -1 : undefined}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
