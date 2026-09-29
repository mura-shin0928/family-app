import { describe, expect, it } from "vitest";
import type { LifeEventTemplate } from "@/features/life-events/default-templates";
import {
  templateItemsToCopy,
  templateKeyFor,
  transitionFor,
} from "@/features/life-events/status";

const item = (title: string) => ({
  title,
  note: null,
  isGovernment: false,
  timingKind: "around" as const,
  anchorEvent: null,
  offsetDays: null,
});

const template: LifeEventTemplate = {
  kind: "birth",
  title: "出産",
  description: "",
  items: [item("出生届を出す"), item("お宮参りに行く")],
};

describe("transitionFor", () => {
  it("adopt moves candidate and skipped to active", () => {
    expect(transitionFor("adopt")).toEqual({
      from: ["candidate", "skipped"],
      to: "active",
    });
  });

  it("skip only applies to candidates", () => {
    expect(transitionFor("skip")).toEqual({
      from: ["candidate"],
      to: "skipped",
    });
  });

  it("record moves active to done and reopen moves it back", () => {
    expect(transitionFor("record")).toEqual({ from: ["active"], to: "done" });
    expect(transitionFor("reopen")).toEqual({ from: ["done"], to: "active" });
  });
});

describe("templateKeyFor", () => {
  it("combines kind and title", () => {
    expect(templateKeyFor("birth", "出生届を出す")).toBe("birth:出生届を出す");
  });
});

describe("templateItemsToCopy", () => {
  it("returns every item when nothing was copied yet", () => {
    expect(templateItemsToCopy(template, new Set())).toHaveLength(2);
  });

  it("skips items whose key already exists, even if skipped or done", () => {
    const existing = new Set([templateKeyFor("birth", "出生届を出す")]);
    expect(templateItemsToCopy(template, existing).map((i) => i.title)).toEqual(
      ["お宮参りに行く"],
    );
  });

  it("returns nothing when all keys exist", () => {
    const existing = new Set(
      template.items.map((i) => templateKeyFor("birth", i.title)),
    );
    expect(templateItemsToCopy(template, existing)).toEqual([]);
  });
});
