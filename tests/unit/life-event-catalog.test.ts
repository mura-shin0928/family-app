import { describe, expect, it } from "vitest";
import {
  findCatalogItem,
  LIFE_EVENT_CATALOG,
  LIFE_EVENT_KINDS,
} from "@/features/life-events/catalog";

describe("LIFE_EVENT_CATALOG", () => {
  it("key は一意", () => {
    const keys = LIFE_EVENT_CATALOG.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("key は「kind:」で始まり、英小文字・数字・ハイフンの slug", () => {
    for (const i of LIFE_EVENT_CATALOG)
      expect(i.key).toMatch(new RegExp(`^${i.kind}:[a-z0-9-]+$`));
  });
  it("妊活の項目は時期を持たない", () => {
    for (const i of LIFE_EVENT_CATALOG.filter(
      (i) => i.kind === "preconception",
    ))
      expect(i.timing).toBeNull();
  });
  it("既存テンプレの項目を落とさず移す（38件）", () => {
    expect(LIFE_EVENT_CATALOG).toHaveLength(38);
  });
  it("出生届は出生日から14日以内（deadline, birth, 13）", () => {
    expect(findCatalogItem("birth:birth-registration")?.timing).toEqual({
      kind: "deadline",
      anchor: "birth",
      offsetDays: 13,
    });
  });
  it("種別の並びは時系列", () => {
    expect(LIFE_EVENT_KINDS.map((k) => k.label)).toEqual([
      "妊活",
      "妊娠",
      "出産",
      "保育園",
      "小学校",
    ]);
  });
});
