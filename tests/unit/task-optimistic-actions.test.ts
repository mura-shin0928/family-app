import { describe, expect, it } from "vitest";
import {
  applyTaskAction,
  optimisticTaskFromCreateInput,
} from "@/features/tasks/optimistic-actions";
import type { TaskDTO } from "@/features/tasks/types";

function makeTask(overrides: Partial<TaskDTO> & { id: string }): TaskDTO {
  return {
    title: "牛乳",
    dueOn: null,
    isPurchase: false,
    status: "open",
    completedAt: null,
    sortOrder: 0,
    url: null,
    note: null,
    purchaseLocationId: null,
    recordChildId: null,
    ...overrides,
  };
}

const NOW = "2026-10-04T03:00:00.000Z";
const LOCATION = "11111111-1111-1111-1111-111111111111";
const CHILD = "22222222-2222-2222-2222-222222222222";

describe("applyTaskAction", () => {
  const a = makeTask({ id: "a" });
  const b = makeTask({ id: "b", title: "卵" });
  const tasks = [a, b];

  it("add は末尾に追加する", () => {
    const c = makeTask({ id: "c" });
    expect(applyTaskAction(tasks, { type: "add", task: c })).toEqual([a, b, c]);
  });

  it("toggle で完了にすると status と completedAt が入る", () => {
    const result = applyTaskAction(tasks, {
      type: "toggle",
      id: "a",
      done: true,
      now: NOW,
    });
    expect(result[0]).toEqual({ ...a, status: "done", completedAt: NOW });
  });

  it("toggle で未完了に戻すと completedAt が消える", () => {
    const done = makeTask({ id: "a", status: "done", completedAt: NOW });
    const result = applyTaskAction([done, b], {
      type: "toggle",
      id: "a",
      done: false,
      now: "2026-10-04T04:00:00.000Z",
    });
    expect(result[0]).toEqual({ ...done, status: "open", completedAt: null });
  });

  it("update は指定した項目だけを上書きする", () => {
    const result = applyTaskAction(tasks, {
      type: "update",
      id: "b",
      fields: { title: "卵 10個", dueOn: "2026-10-05" },
    });
    expect(result[1]).toEqual({ ...b, title: "卵 10個", dueOn: "2026-10-05" });
  });

  it("remove は対象だけを取り除く", () => {
    expect(applyTaskAction(tasks, { type: "remove", id: "a" })).toEqual([b]);
  });

  it("toggle / update は対象以外のタスクを同じ参照のまま残す", () => {
    const toggled = applyTaskAction(tasks, {
      type: "toggle",
      id: "a",
      done: true,
      now: NOW,
    });
    const updated = applyTaskAction(tasks, {
      type: "update",
      id: "a",
      fields: { title: "豆乳" },
    });
    expect(toggled[1]).toBe(b);
    expect(updated[1]).toBe(b);
  });

  it("一致する id が無ければ中身は変わらない", () => {
    expect(
      applyTaskAction(tasks, {
        type: "toggle",
        id: "x",
        done: true,
        now: NOW,
      }),
    ).toEqual(tasks);
    expect(
      applyTaskAction(tasks, {
        type: "update",
        id: "x",
        fields: { title: "豆乳" },
      }),
    ).toEqual(tasks);
    expect(applyTaskAction(tasks, { type: "remove", id: "x" })).toEqual(tasks);
  });

  it("元の配列を書き換えない", () => {
    applyTaskAction(tasks, { type: "add", task: makeTask({ id: "c" }) });
    applyTaskAction(tasks, { type: "remove", id: "a" });
    expect(tasks).toEqual([a, b]);
  });
});

describe("optimisticTaskFromCreateInput", () => {
  it("空文字列の項目を null にして、未完了・末尾の並び順で作る", () => {
    expect(
      optimisticTaskFromCreateInput({
        id: "a",
        title: "牛乳",
        dueOn: "",
        isPurchase: false,
        purchaseLocationId: "",
        recordChildId: "",
      }),
    ).toEqual({
      id: "a",
      title: "牛乳",
      dueOn: null,
      isPurchase: false,
      status: "open",
      completedAt: null,
      sortOrder: Number.MAX_SAFE_INTEGER,
      url: null,
      note: null,
      purchaseLocationId: null,
      recordChildId: null,
    });
  });

  it("入力された期限・買う場所・記録する子をそのまま持つ", () => {
    const task = optimisticTaskFromCreateInput({
      id: "a",
      title: "おむつ",
      dueOn: "2026-10-05",
      isPurchase: true,
      purchaseLocationId: LOCATION,
      recordChildId: CHILD,
    });
    expect(task).toMatchObject({
      dueOn: "2026-10-05",
      isPurchase: true,
      purchaseLocationId: LOCATION,
      recordChildId: CHILD,
    });
  });
});
