import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function NoAccessPage() {
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-semibold">アクセスできません</h1>
      <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
        このアカウントはまだFamilyに登録されていません。管理者に登録を依頼してください。
      </p>
      <form action={signOut}>
        <button type="submit" className="text-sm underline">
          ログアウト
        </button>
      </form>
    </main>
  );
}
