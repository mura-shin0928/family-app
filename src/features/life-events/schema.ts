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
