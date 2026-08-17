import { redirect } from "next/navigation";
import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const { member } = await requireFamilyMember();

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm text-zinc-500">Family App — 準備中</p>
      <p className="text-sm">ようこそ、{member.displayName} さん</p>
      <form action={signOut}>
        <button type="submit" className="text-sm underline">
          ログアウト
        </button>
      </form>
    </main>
  );
}
