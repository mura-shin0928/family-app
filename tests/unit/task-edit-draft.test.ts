import { describe, expect, it } from "vitest";
import {
  buildTaskPatch,
  draftFromTask,
  isDraftDirty,
  patchToTaskFields,
  selectedDueChip,
  validateTaskPatch,
} from "@/features/tasks/edit-draft";
import type { TaskDTO } from "@/features/tasks/types";

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: "00000000-0000-4000-8000-000000000001",
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

const TASK_ID = "00000000-0000-4000-8000-000000000001";
const LOC = "11111111-1111-4111-8111-111111111111";

describe("draftFromTask", () => {
  it("null の url/note を空文字にする", () => {
    expect(draftFromTask(makeTask({ url: null, note: null }))).toMatchObject({
      url: "",
      note: "",
    });
  });
});

describe("buildTaskPatch", () => {
  const original = draftFromTask(
    makeTask({ title: "牛乳", dueOn: "2026-10-05", url: null, note: null }),
  );

  it("変わった項目だけを返す", () => {
    expect(buildTaskPatch(original, { ...original, title: "豆乳" })).toEqual({
      title: "豆乳",
    });
  });

  it("何も変わらなければ空", () => {
    expect(buildTaskPatch(original, { ...original })).toEqual({});
  });

  it("タイトルと URL は trim して比べる", () => {
    expect(buildTaskPatch(original, { ...original, title: " 牛乳 " })).toEqual(
      {},
    );
    expect(
      buildTaskPatch(original, { ...original, url: " https://a.jp " }),
    ).toEqual({ url: "https://a.jp" });
  });

  it("メモは前後の空白を除いて比べ、除いた値を送る", () => {
    expect(buildTaskPatch(original, { ...original, note: "  \n" })).toEqual({});
    expect(
      buildTaskPatch(original, { ...original, note: " Mサイズ\n" }),
    ).toEqual({ note: "Mサイズ" });
  });

  it("期限なし・場所なしは空文字で送る", () => {
    expect(buildTaskPatch(original, { ...original, dueOn: null })).toEqual({
      dueOn: "",
    });
    const withLoc = { ...original, purchaseLocationId: LOC };
    expect(
      buildTaskPatch(withLoc, { ...withLoc, purchaseLocationId: null }),
    ).toEqual({ purchaseLocationId: "" });
  });

  it("買うものをオフにしても場所は送らない", () => {
    const withLoc = { ...original, isPurchase: true, purchaseLocationId: LOC };
    expect(buildTaskPatch(withLoc, { ...withLoc, isPurchase: false })).toEqual({
      isPurchase: false,
    });
  });
});

describe("isDraftDirty", () => {
  it("buildTaskPatch が空なら false、そうでなければ true", () => {
    const o = draftFromTask(makeTask());
    expect(isDraftDirty(o, { ...o, title: `${o.title} ` })).toBe(false);
    expect(isDraftDirty(o, { ...o, isPurchase: !o.isPurchase })).toBe(true);
  });
});

describe("validateTaskPatch", () => {
  it("空白だけのタイトルはエラー", () => {
    expect(validateTaskPatch(TASK_ID, { title: "" })).toEqual({
      ok: false,
      errors: { title: "タイトルを入力してください" },
    });
  });

  it("URL の形式不正はエラー", () => {
    expect(validateTaskPatch(TASK_ID, { url: "abc" })).toEqual({
      ok: false,
      errors: { url: "URLの形式が正しくありません" },
    });
  });

  it("メモ 2001 字はエラー", () => {
    expect(
      validateTaskPatch(TASK_ID, { note: "あ".repeat(2001) }),
    ).toMatchObject({
      ok: false,
      errors: { note: "メモは2000文字以内で入力してください" },
    });
  });

  it("正しい差分は ok", () => {
    expect(
      validateTaskPatch(TASK_ID, { title: "豆乳", url: "", dueOn: "" }),
    ).toEqual({ ok: true });
  });
});

describe("patchToTaskFields", () => {
  it("空文字を null に戻し、含まれない項目は出さない", () => {
    expect(
      patchToTaskFields({
        dueOn: "",
        url: "",
        note: "x",
        purchaseLocationId: "",
      }),
    ).toEqual({ dueOn: null, url: null, note: "x", purchaseLocationId: null });
    expect(patchToTaskFields({ isPurchase: true })).toEqual({
      isPurchase: true,
    });
  });
});

describe("selectedDueChip", () => {
  const today = "2026-10-03";
  it("値に応じて1つだけ選ぶ", () => {
    expect(selectedDueChip("2026-10-03", today, false)).toBe("today");
    expect(selectedDueChip("2026-10-04", today, false)).toBe("tomorrow");
    expect(selectedDueChip("2026-10-20", today, false)).toBe("custom");
    expect(selectedDueChip(null, today, false)).toBe("none");
  });
  it("日付入力を開いている間は「日付を選ぶ」だけ", () => {
    expect(selectedDueChip("2026-10-03", today, true)).toBe("custom");
    expect(selectedDueChip(null, today, true)).toBe("custom");
  });
});
