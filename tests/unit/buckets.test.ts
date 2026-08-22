import { describe, expect, it } from "vitest";
import {
  bucketKeyForDueOn,
  bucketOpenTasks,
  splitOpenAndCompletedToday,
} from "@/features/tasks/buckets";
import type { TaskDTO } from "@/features/tasks/types";

const TODAY = "2026-08-17";

function makeTask(overrides: Partial<TaskDTO> & { id: string }): TaskDTO {
  return {
    title: "タスク",
    dueOn: null,
    isPurchase: false,
    status: "open",
    completedAt: null,
    sortOrder: 0,
    url: null,
    note: null,
    ...overrides,
  };
}

describe("bucketKeyForDueOn", () => {
  it("has no due date -> none", () => {
    expect(bucketKeyForDueOn(null, TODAY)).toBe("none");
  });

  it("is overdue for any past date", () => {
    expect(bucketKeyForDueOn("2026-08-16", TODAY)).toBe("overdue");
  });

  it("is today's bucket when due_on == today", () => {
    expect(bucketKeyForDueOn(TODAY, TODAY)).toBe("today");
  });

  it("is soon at the SOON_DAYS boundary (7th day)", () => {
    expect(bucketKeyForDueOn("2026-08-24", TODAY, 7)).toBe("soon");
  });

  it("falls into upcoming (not none) just past the SOON_DAYS boundary (8th day) -- has a due date, just far out", () => {
    expect(bucketKeyForDueOn("2026-08-25", TODAY, 7)).toBe("upcoming");
  });
});

describe("bucketOpenTasks", () => {
  it("groups tasks into the 5 buckets in due-date order (input assumed pre-sorted), keeping a far-future due date out of the no-due-date bucket", () => {
    const tasks = [
      makeTask({ id: "overdue-1", dueOn: "2026-08-16" }),
      makeTask({ id: "today-1", dueOn: "2026-08-17" }),
      makeTask({ id: "soon-1", dueOn: "2026-08-20" }),
      makeTask({ id: "upcoming-1", dueOn: "2026-09-01" }),
      makeTask({ id: "none-1", dueOn: null }),
    ];

    const buckets = bucketOpenTasks(tasks, TODAY);

    expect(buckets.overdue.map((t) => t.id)).toEqual(["overdue-1"]);
    expect(buckets.today.map((t) => t.id)).toEqual(["today-1"]);
    expect(buckets.soon.map((t) => t.id)).toEqual(["soon-1"]);
    expect(buckets.upcoming.map((t) => t.id)).toEqual(["upcoming-1"]);
    expect(buckets.none.map((t) => t.id)).toEqual(["none-1"]);
  });
});

describe("splitOpenAndCompletedToday", () => {
  it("separates open tasks from completed ones", () => {
    const tasks = [
      makeTask({ id: "open-1", status: "open" }),
      makeTask({
        id: "done-1",
        status: "done",
        completedAt: "2026-08-17T01:00:00Z",
      }),
      makeTask({ id: "open-2", status: "open" }),
    ];

    const { open, completedToday } = splitOpenAndCompletedToday(tasks);

    expect(open.map((t) => t.id)).toEqual(["open-1", "open-2"]);
    expect(completedToday.map((t) => t.id)).toEqual(["done-1"]);
  });
});
