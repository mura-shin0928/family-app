"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { fetchHtml } from "@/features/recipes/extraction/fetch-html";
import { createClient } from "@/lib/supabase/server";
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
import { discoverProcedureLinksSchema, ingestProcedureSchema } from "./schema";
import type { DiscoverCandidate } from "./types";

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
