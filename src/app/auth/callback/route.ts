import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await supabase.rpc("claim_membership");

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
