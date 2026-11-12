import { z } from "zod";
import { findCatalogItem } from "@/features/life-events/catalog";
import { dateStringSchema, noteSchema } from "@/lib/schema";
import { httpUrlSchema } from "@/lib/url";
import { MAX_ITEMS, MAX_QUESTIONS } from "./protocol";
import type { PrepSubject } from "./types";

export const prepSubjectInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
  summary: z.string().trim().max(200),
  note: z.string().trim().max(500).nullable(),
  catalogKey: z.string().min(1).max(200).optional(),
});

export type PrepSubjectInput = z.infer<typeof prepSubjectInputSchema>;

const childIdSchema = z.string().uuid();

export const proposeQuestionsSchema = z.object({
  childId: childIdSchema,
  subject: prepSubjectInputSchema,
});

export const proposePlanSchema = proposeQuestionsSchema.extend({
  answers: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(200),
        answer: z.string().trim().min(1).max(100),
      }),
    )
    .min(1)
    .max(MAX_QUESTIONS),
});

export const addPrepTasksSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(100),
        // 空文字列 = 期限なし
        dueOn: z.union([dateStringSchema, z.literal("")]),
        note: noteSchema,
        url: z.union([httpUrlSchema, z.literal("")]),
      }),
    )
    .min(1)
    .max(MAX_ITEMS),
});

/** テンプレの項目はサーバー側のカタログを正とする。 */
export function resolveSubject(input: PrepSubjectInput): PrepSubject {
  const template = input.catalogKey
    ? findCatalogItem(input.catalogKey)
    : undefined;
  if (template) {
    return {
      title: template.title,
      summary: template.summary,
      note: template.note,
    };
  }
  return { title: input.title, summary: input.summary, note: input.note };
}
