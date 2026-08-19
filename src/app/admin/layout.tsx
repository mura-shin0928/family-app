import type { ReactNode } from "react";
import { requireAppAdmin } from "@/features/auth/guard";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAppAdmin();
  return children;
}
