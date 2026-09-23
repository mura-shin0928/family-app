"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { acceptInvitation } from "../actions";
import type { InvitationPreview } from "../types";

const STATUS_MESSAGE: Record<
  Exclude<InvitationPreview["status"], "ok">,
  string
> = {
  not_found: "招待が見つかりません。URLを確認してください。",
  revoked: "この招待は取り消されています。",
  used: "この招待はすでに使用されています。",
  expired: "この招待の有効期限が切れています。",
  email_mismatch:
    "この招待は別のメールアドレス宛です。招待されたメールアドレスでログインし直してください。",
};

export function AcceptInvitationScreen({
  token,
  preview,
}: {
  token: string;
  preview: InvitationPreview;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      // 成功時は acceptInvitation 内の redirect("/tasks") がここへの復帰を防ぐ。
      const result = await acceptInvitation({ token });
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

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
        textAlign: "center",
      }}
    >
      <Typography variant="h6" component="h1">
        Family App
      </Typography>

      {preview.status === "ok" ? (
        <>
          <Typography variant="body1" sx={{ maxWidth: 320 }}>
            <strong>{preview.familyName}</strong> に参加しますか？
          </Typography>
          <Button
            variant="contained"
            onClick={handleAccept}
            disabled={isPending}
            sx={{ width: 1, maxWidth: 320 }}
          >
            参加する
          </Button>
        </>
      ) : (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 320 }}
        >
          {STATUS_MESSAGE[preview.status]}
        </Typography>
      )}

      {error && (
        <Typography variant="body1" color="error" sx={{ maxWidth: 320 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
