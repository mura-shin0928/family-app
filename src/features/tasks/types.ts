import type { DateString } from "@/lib/date";

export type TaskStatus = "open" | "done";

export type TaskDTO = {
  id: string;
  title: string;
  dueOn: DateString | null;
  isPurchase: boolean;
  status: TaskStatus;
  completedAt: string | null;
  sortOrder: number;
};
