import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  LOGIN_REDIRECT_COOKIE,
  LOGIN_REDIRECT_COOKIE_OPTIONS,
  loginReturnPath,
} from "@/lib/next-path";
import { isPublicPath } from "@/lib/public-paths";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * セッションCookieの更新と、未認証ユーザーの楽観的リダイレクトのみを行う。
 * Family所属の可否（DBアクセスが要る）はここでは判定しない — 各ページ/Server Actionの
 * guard.ts が担う。RLSがデータの最終防衛線であり、ここはUXのためのショートカットに過ぎない。
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    const returnPath = loginReturnPath(
      request.nextUrl.pathname,
      request.nextUrl.search,
    );
    if (returnPath) {
      redirect.cookies.set(
        LOGIN_REDIRECT_COOKIE,
        returnPath,
        LOGIN_REDIRECT_COOKIE_OPTIONS,
      );
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon$|apple-icon$|icons/|ingest/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
