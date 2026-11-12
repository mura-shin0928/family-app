import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  addPrepTasksSchema,
  proposePlanSchema,
  resolveSubject,
} from "@/features/event-prep/schema";
import { findCatalogItem } from "@/features/life-events/catalog";

const childId = randomUUID();
const subject = { title: "七五三", summary: "", note: null };

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    title: "写真館を予約する",
    dueOn: "2027-01-10",
    note: "混む時期がある",
    url: "https://example.com/",
    ...overrides,
  };
}

describe("resolveSubject", () => {
  it("catalogKey がテンプレにあればサーバーのカタログの値を使う", () => {
    const template = findCatalogItem("birth:omiyamairi");
    const s = resolveSubject({
      title: "偽のタイトル",
      summary: "偽",
      note: null,
      catalogKey: "birth:omiyamairi",
    });
    expect(s).toEqual({
      title: template?.title,
      summary: template?.summary,
      note: template?.note,
    });
  });

  it("catalogKey が無い・テンプレに無ければ入力の値を使う", () => {
    expect(resolveSubject(subject)).toEqual(subject);
    expect(resolveSubject({ ...subject, catalogKey: "program:x" })).toEqual(
      subject,
    );
  });
});

describe("proposePlanSchema", () => {
  const answer = { question: "Q", answer: "A" };

  it("答えは 1〜3 件", () => {
    expect(
      proposePlanSchema.safeParse({ childId, subject, answers: [answer] })
        .success,
    ).toBe(true);
    expect(
      proposePlanSchema.safeParse({ childId, subject, answers: [] }).success,
    ).toBe(false);
    expect(
      proposePlanSchema.safeParse({
        childId,
        subject,
        answers: [answer, answer, answer, answer],
      }).success,
    ).toBe(false);
  });

  it("タイトルが空・長すぎる題材は通さない", () => {
    for (const title of ["  ", "あ".repeat(101)]) {
      expect(
        proposePlanSchema.safeParse({
          childId,
          subject: { ...subject, title },
          answers: [answer],
        }).success,
      ).toBe(false);
    }
  });
});

describe("addPrepTasksSchema", () => {
  it("期日と URL の空文字は通す", () => {
    expect(
      addPrepTasksSchema.safeParse({ items: [task({ dueOn: "", url: "" })] })
        .success,
    ).toBe(true);
  });

  it("13 件以上・0 件・http(s) でない URL・形の違う期日は通さない", () => {
    const cases = [
      { items: Array.from({ length: 13 }, () => task()) },
      { items: [] },
      { items: [task({ url: "javascript:alert(1)" })] },
      { items: [task({ dueOn: "2027/1/10" })] },
      { items: [task({ id: "not-a-uuid" })] },
    ];
    for (const input of cases) {
      expect(addPrepTasksSchema.safeParse(input).success).toBe(false);
    }
  });
});
