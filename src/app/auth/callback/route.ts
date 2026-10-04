import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LOGIN_REDIRECT_COOKIE, sanitizeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 招待URLや共有の受け取り画面からのログインは next をクエリではなくCookieで運ぶ
      // （emailRedirectTo にクエリを足すとSupabaseのredirect URL許可リストの
      // 完全一致チェックに通らず site_url にフォールバックしてしまうため）。
      // 所属の判定は戻り先のページ自身が行うため、ここでは待たず遷移させる。
      const cookieStore = await cookies();
      const safeNext = sanitizeNextPath(
        cookieStore.get(LOGIN_REDIRECT_COOKIE)?.value,
      );
      if (safeNext) {
        cookieStore.delete(LOGIN_REDIRECT_COOKIE);
        return NextResponse.redirect(`${origin}${safeNext}`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: member } = await supabase
          .from("family_members")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        return NextResponse.redirect(
          `${origin}${member ? "/tasks" : "/no-access"}`,
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
