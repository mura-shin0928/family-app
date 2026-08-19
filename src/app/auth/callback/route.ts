import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = sanitizeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 招待URL経由のログインは、まだどのFamilyにも属していなくても
      // /invite ページ自身が状態を判定できるため、所属チェックを待たず遷移させる。
      if (safeNext) {
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

        return NextResponse.redirect(`${origin}${member ? "/" : "/no-access"}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
