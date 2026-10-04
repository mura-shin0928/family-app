/**
 * 未設定なら変数名を添えて落とす。モジュールのトップレベルではなく呼び出し時に
 * 検証するのは、環境変数なしの `next build` を通すため。
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  // NEXT_PUBLIC_ はビルド時に置換されるので、動的なキーではなくこの形で参照する。
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください（.env.example を参照）",
    );
  }

  return { url, anonKey };
}
