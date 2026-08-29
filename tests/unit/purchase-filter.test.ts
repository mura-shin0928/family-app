import { describe, expect, it } from "vitest";
import { filterByPurchaseLocation } from "@/features/tasks/purchase-filter";
import type { TaskDTO } from "@/features/tasks/types";

function makeTask(overrides: Partial<TaskDTO> & { id: string }): TaskDTO {
  return {
    title: "買うもの",
    dueOn: null,
    isPurchase: true,
    status: "open",
    completedAt: null,
    sortOrder: 0,
    url: null,
    note: null,
    purchaseLocationId: null,
    ...overrides,
  };
}

const SUPER = "11111111-1111-1111-1111-111111111111";
const DRUG = "22222222-2222-2222-2222-222222222222";
const DELETED = "99999999-9999-9999-9999-999999999999";
const known = new Set([SUPER, DRUG]);

const tasks = [
  makeTask({ id: "a", purchaseLocationId: SUPER }),
  makeTask({ id: "b", purchaseLocationId: DRUG }),
  makeTask({ id: "c", purchaseLocationId: null }),
  makeTask({ id: "d", purchaseLocationId: DELETED }),
];

describe("filterByPurchaseLocation", () => {
  it("'all' returns every task untouched", () => {
    expect(filterByPurchaseLocation(tasks, "all", known)).toEqual(tasks);
  });

  it("a location id keeps only tasks with that location", () => {
    expect(
      filterByPurchaseLocation(tasks, SUPER, known).map((t) => t.id),
    ).toEqual(["a"]);
  });

  it("'none' keeps unset tasks", () => {
    expect(
      filterByPurchaseLocation(tasks, "none", known).map((t) => t.id),
    ).toContain("c");
  });

  it("'none' also catches ids not in the known set (deleted locations)", () => {
    expect(
      filterByPurchaseLocation(tasks, "none", known)
        .map((t) => t.id)
        .sort(),
    ).toEqual(["c", "d"]);
  });
});
