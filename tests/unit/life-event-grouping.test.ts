import { describe, expect, it } from "vitest";
import {
  groupByLifeEvent,
  groupProceduresByStatus,
} from "@/features/life-events/grouping";
import type {
  LifeEvent,
  LifeEventProcedure,
} from "@/features/life-events/types";

function procedure(
  overrides: Partial<LifeEventProcedure> & { id: string },
): LifeEventProcedure {
  return {
    lifeEventId: "e1",
    childId: "c1",
    sortOrder: 1,
    title: overrides.id,
    note: null,
    url: null,
    isGovernment: false,
    timingKind: "around",
    anchorEvent: null,
    offsetDays: null,
    status: "active",
    doneOn: null,
    templateKey: null,
    ...overrides,
  };
}

describe("groupProceduresByStatus", () => {
  it("splits by status and sorts active by sortOrder", () => {
    const grouped = groupProceduresByStatus([
      procedure({ id: "a2", sortOrder: 2 }),
      procedure({ id: "a1", sortOrder: 1 }),
      procedure({ id: "c1", status: "candidate", sortOrder: 5 }),
      procedure({ id: "s1", status: "skipped", sortOrder: 6 }),
    ]);
    expect(grouped.active.map((p) => p.id)).toEqual(["a1", "a2"]);
    expect(grouped.candidates.map((p) => p.id)).toEqual(["c1"]);
    expect(grouped.skipped.map((p) => p.id)).toEqual(["s1"]);
    expect(grouped.done).toEqual([]);
  });

  it("sorts done by doneOn descending, ties by sortOrder", () => {
    const grouped = groupProceduresByStatus([
      procedure({
        id: "d1",
        status: "done",
        doneOn: "2026-03-12",
        sortOrder: 1,
      }),
      procedure({
        id: "d2",
        status: "done",
        doneOn: "2026-05-09",
        sortOrder: 2,
      }),
      procedure({
        id: "d3",
        status: "done",
        doneOn: "2026-03-12",
        sortOrder: 0,
      }),
    ]);
    expect(grouped.done.map((p) => p.id)).toEqual(["d2", "d3", "d1"]);
  });
});

describe("groupByLifeEvent", () => {
  const events: LifeEvent[] = [
    { id: "e1", kind: "pregnancy", childId: "c1", startedOn: null },
    { id: "e2", kind: "birth", childId: "c1", startedOn: null },
  ];

  it("keeps event order and drops events without items", () => {
    const groups = groupByLifeEvent(
      [
        procedure({ id: "x", lifeEventId: "e2" }),
        procedure({ id: "y", lifeEventId: "e2", sortOrder: 2 }),
      ],
      events,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].lifeEvent.id).toBe("e2");
    expect(groups[0].items.map((p) => p.id)).toEqual(["x", "y"]);
  });
});
