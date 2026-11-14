"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { describeChildStage } from "@/features/life-events/search";
import { getFamilyMunicipality } from "@/features/programs/queries";
import { captureEvent } from "@/lib/analytics/server";
import { todayInJst } from "@/lib/date";
import { logActionError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { callAiConsult, isAiConsultConfigured } from "./gemini";
import {
  buildPlanRequestBody,
  buildQuestionsRequestBody,
  parsePlan,
  parseQuestions,
} from "./protocol";
import {
  addConsultTasksSchema,
  type ConsultSubjectInput,
  proposePlanSchema,
  proposeQuestionsSchema,
  resolveSubject,
} from "./schema";
import type {
  ConsultAnswer,
  ConsultContext,
  ConsultPlan,
  ConsultQuestion,
} from "./types";

const QUESTIONS_TIMEOUT_MS = 20_000;
// ページの maxDuration（60秒）に収める
const PLAN_TIMEOUT_MS = 50_000;

export type ConsultFailure =
  | "not_configured"
  | "quota_exceeded"
  | "unavailable"
  | "invalid";

type Prepared =
  | {
      ok: true;
      ctx: ConsultContext;
      member: Awaited<ReturnType<typeof requireFamilyMember>>["member"];
    }
  | { ok: false; reason: ConsultFailure };

/** 子と自治体を引き、枠を1回使ってから文脈を組み立てる。 */
async function prepare(
  childId: string,
  subjectInput: ConsultSubjectInput,
): Promise<Prepared> {
  if (!isAiConsultConfigured()) return { ok: false, reason: "not_configured" };

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("children")
    .select("birth_date, expected_birth_date")
    .eq("id", childId)
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!child) return { ok: false, reason: "invalid" };

  // 外部 API を呼ぶ前に枠を使う（失敗しても1回と数える）
  const { data: allowed, error } = await supabase.rpc(
    "consume_ai_consult_quota",
  );
  if (error) {
    logActionError("aiConsult.quota", error);
    return { ok: false, reason: "unavailable" };
  }
  if (!allowed) return { ok: false, reason: "quota_exceeded" };

  // 自治体が引けなくても提案は続ける
  let municipalityName: string | null = null;
  try {
    municipalityName =
      (await getFamilyMunicipality(member.familyId))?.name ?? null;
  } catch {
    municipalityName = null;
  }

  const dates = {
    birthDate: child.birth_date,
    expectedBirthDate: child.expected_birth_date,
  };
  const today = todayInJst();
  return {
    ok: true,
    member,
    ctx: {
      subject: resolveSubject(subjectInput),
      childStage: describeChildStage(dates, today),
      child: dates,
      municipalityName,
      today,
    },
  };
}

export async function proposeQuestions(input: {
  childId: string;
  subject: ConsultSubjectInput;
}): Promise<
  | { ok: true; questions: ConsultQuestion[] }
  | { ok: false; reason: ConsultFailure }
> {
  const parsed = proposeQuestionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const prepared = await prepare(parsed.data.childId, parsed.data.subject);
  if (!prepared.ok) return prepared;

  const result = await callAiConsult(
    buildQuestionsRequestBody(prepared.ctx),
    QUESTIONS_TIMEOUT_MS,
  );
  const questions = result.ok ? parseQuestions(result.json) : null;
  if (questions === null) return { ok: false, reason: "unavailable" };
  return { ok: true, questions };
}

export async function proposePlan(input: {
  childId: string;
  subject: ConsultSubjectInput;
  answers: ConsultAnswer[];
}): Promise<
  ({ ok: true } & ConsultPlan) | { ok: false; reason: ConsultFailure }
> {
  const parsed = proposePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const prepared = await prepare(parsed.data.childId, parsed.data.subject);
  if (!prepared.ok) return prepared;

  const result = await callAiConsult(
    buildPlanRequestBody(prepared.ctx, parsed.data.answers),
    PLAN_TIMEOUT_MS,
  );
  const plan = result.ok ? parsePlan(result.json) : null;
  if (plan === null) return { ok: false, reason: "unavailable" };

  captureEvent(prepared.member, "ai_consult_proposed");
  return { ok: true, ...plan };
}

const UNIQUE_VIOLATION = "23505";

/** 選んだ提案をタスクにする。id は画面側で振ったもので、再試行で二重にならない。 */
export async function addConsultTasks(input: {
  items: {
    id: string;
    title: string;
    dueOn: string;
    note: string;
  }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = addConsultTasksSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "入力内容を確認してください" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  for (const item of parsed.data.items) {
    const { error } = await supabase.rpc("create_task", {
      p_id: item.id,
      p_title: item.title,
      p_is_purchase: false,
      p_due_on: item.dueOn || undefined,
      p_note: item.note || undefined,
    });
    if (error && error.code !== UNIQUE_VIOLATION) {
      logActionError("addConsultTasks", error);
      return { ok: false, error: "タスクの追加に失敗しました" };
    }
  }

  captureEvent(member, "task_created");
  return { ok: true };
}
