import type { ReactNode } from "react";
import { requireFamilyMember } from "@/features/auth/guard";
import { AppUpdateNotice } from "./AppUpdateNotice";
import { BottomNav } from "./BottomNav";
import { QueryProvider } from "./QueryProvider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireFamilyMember();
  return (
    <QueryProvider>
      {children}
      <AppUpdateNotice />
      <BottomNav />
    </QueryProvider>
  );
}
