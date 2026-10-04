import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Server Component / Server Action / Route Handler から使うクライアント。
 * リクエストごとに新規作成すること（使い回さない）。
 */
export async function createClient() {
  // cookies() を先に呼ぶ。プリレンダー中はここで動的レンダリングに切り替わり、検証まで進まない。
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Component からの呼び出しは書き込み不可のため無視する。
        // セッション更新は proxy.ts が担う。
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // ignore
        }
      },
    },
  });
}
