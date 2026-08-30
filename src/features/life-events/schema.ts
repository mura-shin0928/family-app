import { z } from "zod";
import { LIFE_EVENT_TEMPLATES } from "./default-templates";

const kindValues = LIFE_EVENT_TEMPLATES.map((t) => t.kind) as [
  string,
  ...string[],
];

// 空文字列 = 未入力（children.schema と同じ規約）。
const optionalDateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  z.literal(""),
]);

// すべての手続きは子供単位。childId は必須（妊活も＝子を先に登録する）。
// startedOn は妊活など子の予定日・出生日が無いイベントで、
// anchorEvent: "event_start" の項目の基準日になる（未入力可）。
export const addLifeEventSchema = z.object({
  kind: z.enum(kindValues),
  childId: z.string().uuid("子供を選んでください"),
  startedOn: optionalDateSchema,
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

// 手で足す項目は childId とライフイベント種別(kind)で受ける。その子にその種別の
// ライフイベントが無ければ Server Action 側が空で1つ作って項目をぶら下げる。
// 「誰が決めたか / 時期の硬さ」は選ばせない（既定は自分たち・〜ごろ。編集は P6-3）。
export const addLifeEventProcedureSchema = z.object({
  childId: z.string().uuid(),
  kind: z.enum(kindValues),
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

// procedure → タスク化。モーダルで名前・期限をプリセットしたうえで編集可能にするため、
// タイトルと期限をクライアントから受け取る（title 上限は tasks の createTaskSchema と揃える）。
export const addLifeEventProcedureToTaskSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "タスク名を入力してください")
    .max(200, "タスク名は200文字以内で入力してください"),
  dueOn: optionalDateSchema,
});

// procedure → タスク化の Undo 用。作った task の id を受け取って論理削除する。
export const lifeEventProcedureTaskIdSchema = z.object({
  taskId: z.string().uuid(),
});

// ドラッグ&ドロップ後の並び順を丸ごと受け取る。並び順は子供単位で1本なので childId で
// スコープする。orderedIds は「その子のタブに今見えている全項目の id を新しい順で
// 並べたもの」で、Server Action 側で現在の集合と一致するか確認する
// （途中で別の家族が足した／消したときは弾いて取り直させる）。
export const reorderLifeEventProceduresSchema = z.object({
  childId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});
