import type { ReactNode } from "react";
import { requireFamilyMember } from "@/features/auth/guard";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireFamilyMember();
  return <>{children}</>;
}
