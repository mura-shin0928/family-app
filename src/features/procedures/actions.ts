"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { fetchHtml } from "@/features/recipes/extraction/fetch-html";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATES_BY_KIND } from "./default-templates";
import {
  classifyCandidate,
  extractLinks,
  inferAreaCode,
  isLikelyExcluded,
} from "./discover";
import { extractMainText } from "./extraction/extract-main";
import type { ProcedureDraft } from "./extraction/types";
import { prepareProcedureDraft } from "./ingest";
import { fetchDisallowRules, isPathAllowed } from "./robots";
import {
  addTemplateItemSchema,
  addTemplateItemToTaskSchema,
  deleteTemplateItemSchema,
  discoverProcedureLinksSchema,
  ingestProcedureSchema,
  updateTemplateItemSchema,
  updateTemplateTitleSchema,
  verifyProcedureSchema,
} from "./schema";
import type { DiscoverCandidate, ProcedureCategory } from "./types";

// discoverは候補ページを1req/秒で最大MAX_LINKS件フェッチする（§6.4）。
// ページ側 maxDuration=60秒に収まるよう余裕を持たせる。
const DISCOVER_DEADLINE_MS = 55_000;
const MAX_LINKS = 20;
const REQUEST_INTERVAL_MS = 1_000;
const CANDIDATE_FETCH_TIMEOUT_MS = 6_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type DiscoverProcedureLinksResult =
  | { ok: true; candidates: DiscoverCandidate[]; truncated: boolean }
  | { ok: false; error: string };

export async function discoverProcedureLinks(input: {
  url: string;
  areaCode: string;
}): Promise<DiscoverProcedureLinksResult> {
  const parsed = discoverProcedureLinksSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();

  const seedUrl = new URL(parsed.data.url);
  const deadlineAt = Date.now() + DISCOVER_DEADLINE_MS;

  const rules = await fetchDisallowRules(seedUrl.origin);
  if (!isPathAllowed(rules, seedUrl.pathname)) {
    return {
      ok: false,
      error: "このページはrobots.txtで取得が許可されていません",
    };
  }

  const seedFetched = await fetchHtml(parsed.data.url, { deadlineAt });
  if (!seedFetched.ok) {
    return { ok: false, error: "索引ページを取得できませんでした" };
  }

  const links = extractLinks(seedFetched.html, parsed.data.url).slice(
    0,
    MAX_LINKS,
  );

  const candidates: DiscoverCandidate[] = [];
  let truncated = false;
  // 実際にfetchした回数だけレート制限の間隔を空ける。robots.txt/タイトルの
  // 機械フィルタで弾いたリンクはfetch自体をしないため、間隔待ちも不要。
  let fetchedCount = 0;

  for (let i = 0; i < links.length; i++) {
    if (Date.now() > deadlineAt) {
      truncated = true;
      break;
    }

    const link = links[i];
    const linkUrl = new URL(link.url);
    if (!isPathAllowed(rules, linkUrl.pathname)) continue;
    // リンク文言の時点で明らかにノイズ(審議会・計画等)と分かるものは、
    // ページを取得すらせずに弾く(§対応: 取得前フィルタで所要時間を縮める)。
    if (link.text !== "" && isLikelyExcluded(link.text)) continue;

    if (fetchedCount > 0) await sleep(REQUEST_INTERVAL_MS);
    fetchedCount++;

    const linkDeadline = Math.min(
      deadlineAt,
      Date.now() + CANDIDATE_FETCH_TIMEOUT_MS,
    );
    const page = await fetchHtml(link.url, { deadlineAt: linkDeadline });

    if (!page.ok) {
      candidates.push({
        url: link.url,
        title: link.text || link.url,
        kind: "unknown",
        updatedOn: null,
        likelyExcluded: false,
        areaCode: null,
        fetchFailed: true,
      });
      continue;
    }

    const main = extractMainText(page.html);
    const title = main.title || link.text || link.url;

    candidates.push({
      url: link.url,
      title,
      kind: classifyCandidate(main),
      updatedOn: main.updatedOn,
      likelyExcluded: isLikelyExcluded(title),
      areaCode: inferAreaCode(
        linkUrl.hostname,
        parsed.data.areaCode === "" ? null : parsed.data.areaCode,
      ),
      fetchFailed: false,
    });
  }

  return { ok: true, candidates, truncated };
}

const INGEST_FAILURE_MESSAGES: Record<string, string> = {
  "fetch-failed": "ページを取得できませんでした。",
  "empty-body": "本文を読み取れませんでした。",
  "no-key": "解析機能は現在利用できません。",
  timeout: "解析がタイムアウトしました。時間をおいて再試行してください。",
  "api-error": "解析に失敗しました。時間をおいて再試行してください。",
  "invalid-response": "解析結果を読み取れませんでした。",
};

function toDbRow(draft: ProcedureDraft) {
  return {
    title: draft.title,
    summary: draft.summary,
    obligation: draft.obligation,
    obligation_quote: draft.obligationQuote || null,
    deadline_kind: draft.deadlineKind,
    deadline_on: draft.deadlineOn || null,
    anchor_event: draft.anchorEvent || null,
    offset_count: draft.offsetCount,
    offset_counting: draft.offsetCounting || null,
    window_from_days: draft.windowFromDays,
    window_to_days: draft.windowToDays,
    deadline_quote: draft.deadlineQuote || null,
    deadline_note: draft.deadlineNote || null,
    eligibility: draft.eligibility || null,
    benefits: draft.benefits,
    where_to_apply: draft.whereToApply || null,
    documents: draft.documents || null,
  };
}

export type IngestProcedureResult =
  | { ok: true; status: "inserted" | "already-exists"; droppedCount: number }
  | { ok: false; error: string };

export async function ingestProcedure(input: {
  url: string;
  areaCode: string;
  category: ProcedureCategory;
}): Promise<IngestProcedureResult> {
  const parsed = ingestProcedureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  // procedures RLSは列単位GRANTで本文列の更新を許していない
  // （status/verified_at/verified_by/obligationのみ更新可）。既存行がある場合は
  // draft/published/archivedのいずれでも内容を上書きできないため、素通りさせる。
  const { data: existing } = await supabase
    .from("procedures")
    .select("id")
    .eq("source_url", parsed.data.url)
    .maybeSingle();

  if (existing) {
    return { ok: true, status: "already-exists", droppedCount: 0 };
  }

  const prepared = await prepareProcedureDraft(
    parsed.data.url,
    parsed.data.areaCode,
  );

  if (!prepared.ok) {
    return {
      ok: false,
      error:
        INGEST_FAILURE_MESSAGES[prepared.reason] ?? "取り込みに失敗しました",
    };
  }

  const { draft, sourceTitle, areaCode, droppedReasons } = prepared.prepared;

  if (droppedReasons.length > 0) {
    console.warn(
      `[procedures] verifyQuotesで${droppedReasons.length}件を要確認へ落としました (${parsed.data.url}):`,
      droppedReasons,
    );
  }

  const { error } = await supabase.from("procedures").insert({
    ...toDbRow(draft),
    area_code: areaCode,
    category: parsed.data.category,
    source_url: parsed.data.url,
    source_title: sourceTitle.slice(0, 200),
    fetched_at: new Date().toISOString(),
    status: "draft",
  });

  if (error) {
    return { ok: false, error: "登録に失敗しました" };
  }

  return { ok: true, status: "inserted", droppedCount: droppedReasons.length };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * 家族が初めてこのライフイベントを開いたとき、既定テンプレートを複製してinsertする。
 * 既にあればそれをそのまま返す（家族が編集済みでも上書きしない）。
 */
export async function ensureBirthTemplate(): Promise<
  { ok: true; templateId: string } | { ok: false; error: string }
> {
  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("procedure_templates")
    .select("id")
    .eq("family_id", member.familyId)
    .eq("life_event_kind", "birth")
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) return { ok: true, templateId: existing.id };

  const def = DEFAULT_TEMPLATES_BY_KIND.birth;

  const { data: template, error: templateError } = await supabase
    .from("procedure_templates")
    .insert({
      family_id: member.familyId,
      life_event_kind: def.lifeEventKind,
      title: def.title,
      created_by: member.id,
    })
    .select("id")
    .single();

  if (templateError || !template) {
    return { ok: false, error: "テンプレートの作成に失敗しました" };
  }

  const { error: itemsError } = await supabase
    .from("procedure_template_items")
    .insert(
      def.items.map((item, index) => ({
        template_id: template.id,
        sort_order: index + 1,
        title: item.title,
        note: item.note,
        category: item.category,
        anchor_event: item.anchorEvent,
        offset_days: item.offsetDays,
      })),
    );

  if (itemsError) {
    return { ok: false, error: "テンプレートの作成に失敗しました" };
  }

  return { ok: true, templateId: template.id };
}

export async function updateTemplateTitle(input: {
  templateId: string;
  title: string;
}): Promise<ActionResult> {
  const parsed = updateTemplateTitleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("procedure_templates")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.templateId);

  if (error) return { ok: false, error: "更新に失敗しました" };
  return { ok: true };
}

export async function addTemplateItem(input: {
  templateId: string;
  title: string;
  note: string;
  category: string;
  anchorEvent: string;
  offsetDays: number | "";
}): Promise<ActionResult> {
  const parsed = addTemplateItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("procedure_template_items")
    .select("sort_order")
    .eq("template_id", parsed.data.templateId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("procedure_template_items").insert({
    template_id: parsed.data.templateId,
    sort_order: (last?.sort_order ?? 0) + 1,
    title: parsed.data.title,
    note: parsed.data.note === "" ? null : parsed.data.note,
    category: parsed.data.category === "" ? null : parsed.data.category,
    anchor_event:
      parsed.data.anchorEvent === "" ? null : parsed.data.anchorEvent,
    offset_days: parsed.data.offsetDays === "" ? null : parsed.data.offsetDays,
  });

  if (error) return { ok: false, error: "追加に失敗しました" };
  return { ok: true };
}

export async function updateTemplateItem(input: {
  itemId: string;
  title: string;
  note: string;
  category: string;
  anchorEvent: string;
  offsetDays: number | "";
}): Promise<ActionResult> {
  const parsed = updateTemplateItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("procedure_template_items")
    .update({
      title: parsed.data.title,
      note: parsed.data.note === "" ? null : parsed.data.note,
      category: parsed.data.category === "" ? null : parsed.data.category,
      anchor_event:
        parsed.data.anchorEvent === "" ? null : parsed.data.anchorEvent,
      offset_days:
        parsed.data.offsetDays === "" ? null : parsed.data.offsetDays,
    })
    .eq("id", parsed.data.itemId);

  if (error) return { ok: false, error: "更新に失敗しました" };
  return { ok: true };
}

export async function deleteTemplateItem(input: {
  itemId: string;
}): Promise<ActionResult> {
  const parsed = deleteTemplateItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "不正な操作です" };

  await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("procedure_template_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.itemId);

  if (error) return { ok: false, error: "削除に失敗しました" };
  return { ok: true };
}

/**
 * draftのprocedureを内容を確認したうえでpublishedにする（既存の確認操作、
 * §procedures_verify）。列単位GRANTでstatus/verified_at/verified_byしか
 * 更新できないため、本文を書き換えて公開する経路は無い。
 */
export async function verifyProcedure(input: {
  procedureId: string;
}): Promise<ActionResult> {
  const parsed = verifyProcedureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "不正な操作です" };

  const { userId } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("procedures")
    .update({
      status: "published",
      verified_at: new Date().toISOString(),
      verified_by: userId,
    })
    .eq("id", parsed.data.procedureId);

  if (error) return { ok: false, error: "確認に失敗しました" };
  return { ok: true };
}

/**
 * テンプレート項目を「やることに追加」する。recipe_ingredients.task_id と同じ
 * コピー方式（[[project-recipe-stock-replan]]）: title/due_on/url/noteをtasksへ
 * コピーし、family_procedures はどの項目をTask化したかのリンクだけを持つ。
 * procedureIdが無くても(=まだ制度情報が未登録でも)追加できる。
 */
export async function addTemplateItemToTask(input: {
  templateItemId: string;
  childId: string;
  title: string;
  dueOn: string;
  url: string;
  note: string;
  procedureId: string;
}): Promise<ActionResult> {
  const parsed = addTemplateItemToTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: lastTask } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (lastTask?.sort_order ?? 0) + 1;

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      family_id: member.familyId,
      title: parsed.data.title,
      due_on: parsed.data.dueOn === "" ? null : parsed.data.dueOn,
      url: parsed.data.url === "" ? null : parsed.data.url,
      note: parsed.data.note === "" ? null : parsed.data.note,
      sort_order: nextSortOrder,
      created_by: member.id,
    })
    .select("id")
    .single();

  if (taskError || !task) {
    return { ok: false, error: "やることへの追加に失敗しました" };
  }

  const { error: linkError } = await supabase.from("family_procedures").upsert(
    {
      family_id: member.familyId,
      template_item_id: parsed.data.templateItemId,
      child_id: parsed.data.childId === "" ? null : parsed.data.childId,
      procedure_id:
        parsed.data.procedureId === "" ? null : parsed.data.procedureId,
      task_id: task.id,
      added_by: member.id,
    },
    { onConflict: "family_id,template_item_id,child_id" },
  );

  if (linkError) {
    return { ok: false, error: "やることへの追加に失敗しました" };
  }

  return { ok: true };
}
