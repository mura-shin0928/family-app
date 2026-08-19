import Chip from "@mui/material/Chip";
import type { InvitationListStatus } from "../status";

const STATUS_LABEL: Record<InvitationListStatus, string> = {
  pending: "招待中",
  accepted: "参加済み",
  revoked: "取り消し済み",
  expired: "期限切れ",
};

const STATUS_COLOR: Record<
  InvitationListStatus,
  "info" | "success" | "default" | "warning"
> = {
  pending: "info",
  accepted: "success",
  revoked: "default",
  expired: "warning",
};

export function InvitationStatusChip({
  status,
}: {
  status: InvitationListStatus;
}) {
  return <Chip label={STATUS_LABEL[status]} color={STATUS_COLOR[status]} />;
}
