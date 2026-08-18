"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { getTasks } from "./queries";
import type { TaskDTO } from "./types";

/**
 * TanStack QueryのqueryFnから直接呼ぶ読み取り専用アクション。familyIdは
 * クライアントからではなく毎回セッションから解決する（他アクションと同じ信頼境界）。
 */
export async function fetchTasks(): Promise<TaskDTO[]> {
  const { member } = await requireFamilyMember();
  return getTasks(member.familyId);
}
