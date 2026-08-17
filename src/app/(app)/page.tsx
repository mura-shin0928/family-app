import { redirect } from "next/navigation";
import { requireFamilyMember } from "@/features/auth/guard";
import { TaskListScreen } from "@/features/tasks/components/TaskListScreen";
import { getTasks } from "@/features/tasks/queries";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const { member } = await requireFamilyMember();
  const tasks = await getTasks(member.familyId);

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">一覧</h1>
        <form action={signOut}>
          <button type="submit" className="text-xs text-zinc-500 underline">
            {member.displayName} / ログアウト
          </button>
        </form>
      </header>
      <TaskListScreen initialTasks={tasks} />
    </main>
  );
}
