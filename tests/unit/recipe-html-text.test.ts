import { describe, expect, it } from "vitest";
import { metaContent } from "@/features/recipes/extraction/html-text";

describe("metaContent", () => {
  it("reads content by property", () => {
    expect(
      metaContent(`<meta property="og:title" content="カレー">`, "og:title"),
    ).toBe("カレー");
  });

  it("reads content written before property", () => {
    expect(
      metaContent(`<meta content="カレー" property="og:title" />`, "og:title"),
    ).toBe("カレー");
  });

  it("reads content keyed by name instead of property", () => {
    expect(
      metaContent(`<meta name="og:image" content="/a.jpg">`, "og:image"),
    ).toBe("/a.jpg");
  });

  it("handles single-quoted and unquoted attribute values", () => {
    expect(
      metaContent(`<meta property='og:title' content='カレー'>`, "og:title"),
    ).toBe("カレー");
    expect(
      metaContent(
        `<meta property=og:image content=https://a.jp/a.jpg>`,
        "og:image",
      ),
    ).toBe("https://a.jp/a.jpg");
  });

  it("keeps the other kind of quote inside a quoted value", () => {
    expect(
      metaContent(
        `<meta property="og:title" content="Mom's curry">`,
        "og:title",
      ),
    ).toBe("Mom's curry");
  });

  it("does not stop at a > inside a quoted value", () => {
    expect(
      metaContent(`<meta property="og:title" content="a > b">`, "og:title"),
    ).toBe("a > b");
  });

  it("decodes HTML entities and trims", () => {
    expect(
      metaContent(
        `<meta property="og:title" content=" 肉 &amp; 野菜 ">`,
        "og:title",
      ),
    ).toBe("肉 & 野菜");
  });

  it("matches the key case-insensitively and exactly", () => {
    expect(
      metaContent(`<META PROPERTY="OG:Title" CONTENT="カレー">`, "og:title"),
    ).toBe("カレー");
    expect(
      metaContent(`<meta property="og:image:width" content="600">`, "og:image"),
    ).toBeNull();
  });

  it("skips an empty content and uses the next matching tag", () => {
    expect(
      metaContent(
        `<meta property="og:image" content=""><meta property="og:image" content="/b.jpg">`,
        "og:image",
      ),
    ).toBe("/b.jpg");
  });

  it("returns null when no tag matches", () => {
    expect(
      metaContent(`<meta name="description" content="x">`, "og:title"),
    ).toBeNull();
  });
});
