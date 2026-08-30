import { z } from "zod";
import { LIFE_EVENT_TEMPLATES } from "./default-templates";

const kindValues = LIFE_EVENT_TEMPLATES.map((t) => t.kind) as [
  string,
  ...string[],
];

// childId は未選択でもよい（子供の登録前でもリストは足せる。目安時期が出ないだけ）。
export const addLifeEventSchema = z.object({
  kind: z.enum(kindValues),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(50, "タイトルは50文字以内で入力してください"),
  childId: z.union([z.string().uuid(), z.literal("")]),
});

// 文字数上限は life_event_procedures の CHECK 制約と揃える（title<=100 / note<=2000）。
const procedureTitleSchema = z
  .string()
  .trim()
  .min(1, "項目名を入力してください")
  .max(100, "項目名は100文字以内で入力してください");

// 空文字列 = メモなし（tasks の updateNoteSchema と同じ規約）。
const procedureNoteSchema = z.union([
  z.string().trim().max(2000, "メモは2000文字以内で入力してください"),
  z.literal(""),
]);

// 手で足す項目は「誰が決めたか / 時期の硬さ」を選ばせない（既定は自分たち・〜ごろ）。
// その編集は P6-3 で入れる。
export const addLifeEventProcedureSchema = z.object({
  lifeEventId: z.string().uuid(),
  title: procedureTitleSchema,
});

export const updateLifeEventProcedureTitleSchema = z.object({
  id: z.string().uuid(),
  title: procedureTitleSchema,
});

export const updateLifeEventProcedureNoteSchema = z.object({
  id: z.string().uuid(),
  note: procedureNoteSchema,
});

// 「行政手続きか / 時期の硬さ / 基準日・オフセット」をまとめて1フォームで受け取る
// （P6-3で足す編集）。空文字列 = 未設定:
//  - anchorEvent="" / offsetDays="" は「目安時期を出さない」
export const updateLifeEventProcedureTimingSchema = z.object({
  id: z.string().uuid(),
  isGovernment: z.boolean(),
  timingKind: z.enum(["deadline", "around"]),
  anchorEvent: z.union([
    z.enum(["birth", "expected_birth", "event_start"]),
    z.literal(""),
  ]),
  // smallint に収まる符号付き整数（負 = 基準日より前）。
  offsetDays: z.union([
    z.literal(""),
    z.coerce.number().int().gte(-32768).lte(32767),
  ]),
});

export const lifeEventProcedureIdSchema = z.object({
  id: z.string().uuid(),
});

// ドラッグ&ドロップ後の並び順を丸ごと受け取る。orderedIds は「今リストに見えている
// 全項目の id を新しい順で並べたもの」で、Server Action 側で現在の集合と一致するか
// 確認する（途中で別の家族が足した／消したときは弾いて取り直させる）。
export const reorderLifeEventProceduresSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
