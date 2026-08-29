import { redirect } from "next/navigation";

/**
 * 一覧は /tasks に移した（/tasks/settings を配下に持たせるため）。
 * ここは消せない — ホーム画面に追加済みのPWAショートカットは manifest を
 * 書き換えても start_url: "/" を持ち続けるため、その入口を生かしておく。
 * 恒久リダイレクト(308)にはしない（ブラウザにキャッシュされて後戻りできなくなる）。
 */
export default function HomePage() {
  redirect("/tasks");
}
