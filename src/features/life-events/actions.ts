"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { findLifeEventTemplate } from "./default-templates";
import { addLifeEventSchema } from "./schema";
import type { LifeEventKind } from "./types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * ライフイベントを1つ足し、そのテンプレートの項目を家族のリストの末尾にコピーする。
 * コピー後はテンプレートと切り離され、家族が自由に編集できる（この編集済みリスト
 * そのものが家族の記録になる）。同じ種別を何度でも足せる（第2子など）。
 *
 * 末尾に足すだけで、基準日順に差し込むことはしない — 基準日が未入力のイベントが
 * あると時系列に並べようがないため、初期配置は単純にして並べ替え(P6-2)に委ねる。
 */
export async function addLifeEvent(input: {
  kind: string;
  title: string;
  childId: string;
}): Promise<ActionResult> {
  const parsed = addLifeEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const template = findLifeEventTemplate(parsed.data.kind as LifeEventKind);
  if (!template) {
    return { ok: false, error: "このライフイベントは選べません" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("life_events")
    .insert({
      family_id: member.familyId,
      kind: template.kind,
      title: parsed.data.title,
      child_id: parsed.data.childId === "" ? null : parsed.data.childId,
      created_by: member.id,
    })
    .select("id")
    .single();

  if (eventError || !event) {
    return { ok: false, error: "ライフイベントの追加に失敗しました" };
  }

  const { data: last } = await supabase
    .from("life_event_procedures")
    .select("sort_order")
    .eq("family_id", member.familyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseSortOrder = last?.sort_order ?? 0;

  const { error: itemsError } = await supabase
    .from("life_event_procedures")
    .insert(
      template.items.map((item, index) => ({
        family_id: member.familyId,
        life_event_id: event.id,
        sort_order: baseSortOrder + index + 1,
        title: item.title,
        note: item.note,
        decided_by: item.decidedBy,
        timing_kind: item.timingKind,
        anchor_event: item.anchorEvent,
        offset_days: item.offsetDays,
        category: item.category,
      })),
    );

  if (itemsError) {
    // 項目が1つも入らなかったイベントだけが残ると、消す手段が無いまま
    // リストに居座ってしまう（イベントの削除UIは無い）。作りかけを畳んでおく。
    await supabase
      .from("life_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", event.id);
    return { ok: false, error: "ライフイベントの追加に失敗しました" };
  }

  return { ok: true };
}
