import { describe, expect, it } from "vitest";
import {
  isEmptyShareDraft,
  parseShareInput,
} from "@/features/tasks/share-input";

describe("parseShareInput", () => {
  it("url パラメータをそのまま使う", () => {
    expect(
      parseShareInput({ url: "https://www.instagram.com/p/abc/" }),
    ).toEqual({
      title: "",
      url: "https://www.instagram.com/p/abc/",
      note: "",
    });
  });

  it("text に埋まった URL を取り出し、残りをメモにする", () => {
    expect(
      parseShareInput({ text: "このレシピ良さそう https://x.com/a/status/1" }),
    ).toEqual({
      title: "",
      url: "https://x.com/a/status/1",
      note: "このレシピ良さそう",
    });
  });

  it("text が URL だけならメモは空", () => {
    expect(parseShareInput({ text: "https://example.com/a" }).note).toBe("");
  });

  it.each([
    ["見て！https://x.com/a/status/1。", "https://x.com/a/status/1"],
    ["「https://example.com/a」", "https://example.com/a"],
    ["(https://example.com/a)", "https://example.com/a"],
    ["https://example.com/a?b=1&c=2 です", "https://example.com/a?b=1&c=2"],
    ["https://example.com/aです", "https://example.com/a"],
  ])("URL の前後の文字を含めない: %s", (text, expected) => {
    expect(parseShareInput({ text }).url).toBe(expected);
  });

  it("URL が複数あれば最初の1つを使い、残りはメモに残す", () => {
    const draft = parseShareInput({
      text: "https://a.example/1 と https://b.example/2",
    });
    expect(draft.url).toBe("https://a.example/1");
    expect(draft.note).toBe("と https://b.example/2");
  });

  it("url が http(s) でなければ text 側を探す", () => {
    expect(
      parseShareInput({
        url: "javascript:alert(1)",
        text: "https://example.com/a",
      }).url,
    ).toBe("https://example.com/a");
  });

  it("url パラメータがあるとき text は丸ごとメモ", () => {
    expect(
      parseShareInput({ url: "https://example.com/a", text: "メモ本文" }).note,
    ).toBe("メモ本文");
  });

  it("URL が無ければ url は空、text はメモ", () => {
    expect(parseShareInput({ text: "牛乳を買う" })).toEqual({
      title: "",
      url: "",
      note: "牛乳を買う",
    });
  });

  it("2000文字を超える URL は採らない", () => {
    const long = `https://example.com/${"a".repeat(2000)}`;
    expect(parseShareInput({ url: long }).url).toBe("");
  });

  it("title は200文字、note は2000文字で切る", () => {
    const draft = parseShareInput({
      title: "あ".repeat(300),
      text: "い".repeat(3000),
    });
    expect(draft.title).toHaveLength(200);
    expect(draft.note).toHaveLength(2000);
  });

  it("配列で届いたら最初の値を使う", () => {
    expect(parseShareInput({ text: ["https://example.com/a", "x"] }).url).toBe(
      "https://example.com/a",
    );
  });

  it("前後の空白を落とす", () => {
    expect(parseShareInput({ title: "  ページ名  " }).title).toBe("ページ名");
  });
});

describe("isEmptyShareDraft", () => {
  it("すべて空なら true", () => {
    expect(isEmptyShareDraft(parseShareInput({}))).toBe(true);
  });
  it("どれか入っていれば false", () => {
    expect(isEmptyShareDraft(parseShareInput({ text: "a" }))).toBe(false);
  });
});
