"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type FormEvent, useState, useTransition } from "react";
import { sendInviteLoginLink } from "../actions";

export function InviteEmailForm({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendInviteLoginLink({ token, email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 320, textAlign: "center" }}
      >
        {email} 宛にログインリンクを送りました。メールを確認してください。
      </Typography>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: 1,
        maxWidth: 320,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 1 }}
      >
        招待されたメールアドレスを入力してください。
      </Typography>
      <TextField
        type="email"
        required
        size="small"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="メールアドレス"
      />
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}
      <Button type="submit" variant="contained" disabled={isPending}>
        確認する
      </Button>
    </Box>
  );
}
