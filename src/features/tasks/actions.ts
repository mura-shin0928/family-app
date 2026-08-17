"use server";

import { revalidatePath } from "next/cache";
import { requireFamilyMember } from "@/features/auth/guard";
import { todayInJst, tomorrowInJst } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  taskIdSchema,
  toggleDoneSchema,
  updateDueDateSchema,
} from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createTask(input: {
  id: string;
  title: string;
  due: "none" | "today" | "tomorrow";
  isPurchase: boolean;
}): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const dueOn =
    parsed.data.due === "today"
      ? todayInJst()
      : parsed.data.due === "tomorrow"
        ? tomorrowInJst()
        : null;

  const { data: lastTask } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (lastTask?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("tasks").insert({
    id: parsed.data.id,
    family_id: member.familyId,
    title: parsed.data.title,
    due_on: dueOn,
    is_purchase: parsed.data.isPurchase,
    sort_order: nextSortOrder,
    created_by: member.id,
  });

  if (error) {
    return { ok: false, error: "登録に失敗しました" };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function setTaskDone(input: {
  taskId: string;
  done: boolean;
}): Promise<ActionResult> {
  const parsed = toggleDoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update(
      parsed.data.done
        ? {
            status: "done",
            completed_at: new Date().toISOString(),
            completed_by: member.id,
          }
        : { status: "open", completed_at: null, completed_by: null },
    )
    .eq("id", parsed.data.taskId)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "更新に失敗しました" };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function updateTaskDueDate(input: {
  taskId: string;
  dueOn: string;
}): Promise<ActionResult> {
  const parsed = updateDueDateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な日付です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ due_on: parsed.data.dueOn === "" ? null : parsed.data.dueOn })
    .eq("id", parsed.data.taskId)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "期限の更新に失敗しました" };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function deleteTask(input: {
  taskId: string;
}): Promise<ActionResult> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.taskId)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "削除に失敗しました" };
  }

  revalidatePath("/");
  return { ok: true };
}
