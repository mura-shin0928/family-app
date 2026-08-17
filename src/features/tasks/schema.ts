import { z } from "zod";

export const quickCaptureDueChoiceSchema = z.enum([
  "none",
  "today",
  "tomorrow",
]);
export type QuickCaptureDueChoice = z.infer<typeof quickCaptureDueChoiceSchema>;

export const createTaskSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  due: quickCaptureDueChoiceSchema,
  isPurchase: z.boolean(),
});

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません");

export const taskIdSchema = z.object({
  taskId: z.string().uuid(),
});

export const toggleDoneSchema = z.object({
  taskId: z.string().uuid(),
  done: z.boolean(),
});

export const updateDueDateSchema = z.object({
  taskId: z.string().uuid(),
  dueOn: z.union([dateStringSchema, z.literal("")]),
});
