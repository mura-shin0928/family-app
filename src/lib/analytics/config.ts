/** サーバーからの送信先（PostHog Cloud EU）。ブラウザは /ingest 経由で送る。 */
export const POSTHOG_HOST = "https://eu.i.posthog.com";

/** 本番にだけ置くキー。なければ計測もエラー送信もしない。 */
export function getPosthogKey(): string | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return key ? key : null;
}
