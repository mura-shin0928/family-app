"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { sanitizeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/client";

function buildCallbackUrl(safeNext: string | null): string {
  const url = `${window.location.origin}/auth/callback`;
  return safeNext ? `${url}?next=${encodeURIComponent(safeNext)}` : url;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const safeNext = sanitizeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildCallbackUrl(safeNext) },
    });
    if (error) setError(error.message);
  }

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: buildCallbackUrl(safeNext) },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
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
        gap: 3,
        p: 4,
      }}
    >
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Family App
      </Typography>

      <Button
        variant="contained"
        color="inherit"
        onClick={handleGoogleLogin}
        sx={{
          width: 1,
          maxWidth: 320,
          bgcolor: "text.primary",
          color: "background.paper",
        }}
      >
        Googleでログイン
      </Button>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ width: 1, maxWidth: 320, textAlign: "center" }}
      >
        または
      </Typography>

      {sent ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 320, textAlign: "center" }}
        >
          {email} 宛にログインリンクを送りました。メールを確認してください。
        </Typography>
      ) : (
        <Stack
          component="form"
          onSubmit={handleMagicLink}
          spacing={1}
          sx={{ width: 1, maxWidth: 320 }}
        >
          <TextField
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="メールアドレス"
            size="small"
          />
          <Button type="submit" variant="outlined" disabled={loading}>
            ログインリンクを送る
          </Button>
        </Stack>
      )}

      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
