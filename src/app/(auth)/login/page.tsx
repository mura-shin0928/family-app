"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Family App</h1>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full max-w-xs rounded-md bg-black px-4 py-3 text-white dark:bg-white dark:text-black"
      >
        Googleでログイン
      </button>

      <div className="w-full max-w-xs text-center text-sm text-zinc-500">
        または
      </div>

      {sent ? (
        <p className="max-w-xs text-center text-sm text-zinc-600 dark:text-zinc-400">
          {email} 宛にログインリンクを送りました。メールを確認してください。
        </p>
      ) : (
        <form
          onSubmit={handleMagicLink}
          className="flex w-full max-w-xs flex-col gap-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="メールアドレス"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-black"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md border border-zinc-300 px-4 py-2 disabled:opacity-50 dark:border-zinc-700"
          >
            ログインリンクを送る
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
