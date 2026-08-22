import type { DateString } from "@/lib/date";

export const TASKS_QUERY_KEY = ["tasks"] as const;

export type TaskStatus = "open" | "done";

export type TaskDTO = {
  id: string;
  title: string;
  dueOn: DateString | null;
  isPurchase: boolean;
  status: TaskStatus;
  completedAt: string | null;
  sortOrder: number;
  url: string | null;
  note: string | null;
};
