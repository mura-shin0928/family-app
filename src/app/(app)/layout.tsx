import type { ReactNode } from "react";
import { AppUpdateNotice } from "./AppUpdateNotice";
import { BottomNav } from "./BottomNav";
import { QueryProvider } from "./QueryProvider";

/**
 * この layout は認証を await しない。await するとその時点で下位ツリー全体が
 * 動的になり、React の static shell（<html><head> と loading.tsx のスケルトン）を
 * flush できず初期表示が数百ms〜1.5秒空白になるため。
 *
 * 認可は各ページ側で担保している:
 *   - 未認証のリダイレクトは proxy.ts（middleware）
 *   - (app) 配下の各 page.tsx が個別に requireFamilyMember() を呼ぶ
 *   - データの最終防衛線は Supabase RLS
 * (app) 配下にページを追加するときは、その page.tsx で必ず
 * requireFamilyMember()（管理者のみなら requireAppAdmin()）を呼ぶこと。
 * ここで一括ガードはしていない。
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <AppUpdateNotice />
      <BottomNav />
    </QueryProvider>
  );
}
