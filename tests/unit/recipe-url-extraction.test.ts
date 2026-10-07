import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isSnsHost } from "@/features/recipes/extraction/detect";
import { extractRecipeFromJsonLd } from "@/features/recipes/extraction/jsonld";
import { extractReadable } from "@/features/recipes/extraction/readable";
import { splitIngredientNameAndQuantity } from "@/features/recipes/extraction/split-ingredient";

const guardedGet = vi.hoisted(() => vi.fn());
vi.mock("@/features/recipes/extraction/guarded-request", () => ({
  guardedGet,
}));

describe("isSnsHost", () => {
  it("returns true for X (x.com / twitter.com), with or without www", () => {
    expect(isSnsHost("https://x.com/foo/status/1")).toBe(true);
    expect(isSnsHost("https://www.x.com/foo/status/1")).toBe(true);
    expect(isSnsHost("https://twitter.com/foo/status/1")).toBe(true);
    expect(isSnsHost("https://www.twitter.com/foo")).toBe(true);
  });

  it("returns true for Instagram, with or without www", () => {
    expect(isSnsHost("https://instagram.com/p/abc")).toBe(true);
    expect(isSnsHost("https://www.instagram.com/p/abc")).toBe(true);
  });

  it("returns false for a general recipe site", () => {
    expect(isSnsHost("https://cookpad.com/recipe/12345")).toBe(false);
  });

  it("returns false for an invalid URL", () => {
    expect(isSnsHost("not a url")).toBe(false);
  });
});

describe("splitIngredientNameAndQuantity", () => {
  // 実サイト（キッコーマン、個別レシピページ）のrecipeIngredientをそのまま使った回帰テスト。
  const kikkomanSample: [string, { name: string; quantity: string }][] = [
    ["鶏むね肉 1枚（300g）", { name: "鶏むね肉", quantity: "1枚（300g）" }],
    ["揚げ油 適量", { name: "揚げ油", quantity: "適量" }],
    ["レタス 適宜", { name: "レタス", quantity: "適宜" }],
    [
      "キッコーマン旨みひろがる 香り白だし 大さじ1",
      { name: "キッコーマン旨みひろがる 香り白だし", quantity: "大さじ1" },
    ],
    [
      "おろしにんにく 小さじ1/2",
      { name: "おろしにんにく", quantity: "小さじ1/2" },
    ],
    ["冷水 80ml", { name: "冷水", quantity: "80ml" }],
    ["薄力粉 50g", { name: "薄力粉", quantity: "50g" }],
    ["マヨネーズ 大さじ1", { name: "マヨネーズ", quantity: "大さじ1" }],
  ];

  it.each(kikkomanSample)("splits %s", (input, expected) => {
    expect(splitIngredientNameAndQuantity(input)).toEqual(expected);
  });

  it("keeps the whole string as name when there is no space to split on", () => {
    expect(splitIngredientNameAndQuantity("醤油")).toEqual({
      name: "醤油",
      quantity: "",
    });
  });

  it("keeps the whole string as name when the trailing token doesn't look like a quantity", () => {
    expect(
      splitIngredientNameAndQuantity("エキストラバージン オリーブオイル"),
    ).toEqual({
      name: "エキストラバージン オリーブオイル",
      quantity: "",
    });
  });
});

describe("extractRecipeFromJsonLd", () => {
  it("extracts title and ingredients from a plain Recipe object", () => {
    const html = `<html><head><script type="application/ld+json">
      {"@context":"https://schema.org/","@type":"Recipe","name":"鶏の照り焼き",
       "recipeIngredient":["鶏もも肉 300g","白菜 1/4個"]}
    </script></head></html>`;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "鶏の照り焼き",
      servings: "",
      ingredients: [
        { name: "鶏もも肉", quantity: "300g" },
        { name: "白菜", quantity: "1/4個" },
      ],
    });
  });

  it("extracts recipeYield as-is when it already reads naturally (実サイト形式)", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"サクサク鶏天","recipeYield":"2人分","recipeIngredient":["鶏むね肉 1枚"]}
    </script>`;

    expect(extractRecipeFromJsonLd(html)?.servings).toBe("2人分");
  });

  it("appends 人分 when recipeYield is a bare number or numeric string", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"カレー","recipeYield":4,"recipeIngredient":["カレールー 1箱"]}
    </script>`;

    expect(extractRecipeFromJsonLd(html)?.servings).toBe("4人分");
  });

  it("takes the first string when recipeYield is an array", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"パスタ","recipeYield":["2人分","2 servings"],"recipeIngredient":["パスタ 200g"]}
    </script>`;

    expect(extractRecipeFromJsonLd(html)?.servings).toBe("2人分");
  });

  it("defaults servings to an empty string when recipeYield is absent", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"目玉焼き","recipeIngredient":["卵 1個"]}
    </script>`;

    expect(extractRecipeFromJsonLd(html)?.servings).toBe("");
  });

  it("extracts from an array-rooted JSON-LD document", () => {
    const html = `<script type="application/ld+json">
      [{"@type":"BreadcrumbList"},{"@type":"Recipe","name":"カレー","recipeIngredient":["カレールー 1箱"]}]
    </script>`;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "カレー",
      servings: "",
      ingredients: [{ name: "カレールー", quantity: "1箱" }],
    });
  });

  it("extracts a Recipe nested inside @graph", () => {
    const html = `<script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"WebSite"},
        {"@type":"Recipe","name":"味噌汁","recipeIngredient":["味噌 大さじ2"]}
      ]}
    </script>`;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "味噌汁",
      servings: "",
      ingredients: [{ name: "味噌", quantity: "大さじ2" }],
    });
  });

  it("matches when @type is an array containing Recipe", () => {
    const html = `<script type="application/ld+json">
      {"@type":["Recipe","Thing"],"name":"炒飯","recipeIngredient":["卵 2個"]}
    </script>`;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "炒飯",
      servings: "",
      ingredients: [{ name: "卵", quantity: "2個" }],
    });
  });

  it("accepts a single string for recipeIngredient", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"目玉焼き","recipeIngredient":"卵 1個"}
    </script>`;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "目玉焼き",
      servings: "",
      ingredients: [{ name: "卵", quantity: "1個" }],
    });
  });

  it("returns null when no Recipe node is present", () => {
    const html = `<script type="application/ld+json">{"@type":"WebSite","name":"Example"}</script>`;
    expect(extractRecipeFromJsonLd(html)).toBeNull();
  });

  it("returns null when there is no JSON-LD at all", () => {
    expect(
      extractRecipeFromJsonLd("<html><body>本文だけ</body></html>"),
    ).toBeNull();
  });

  it("skips a malformed JSON-LD block and still reads a later valid one", () => {
    const html = `
      <script type="application/ld+json">{ not valid json </script>
      <script type="application/ld+json">{"@type":"Recipe","name":"焼き魚","recipeIngredient":["鮭 1切れ"]}</script>
    `;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "焼き魚",
      servings: "",
      ingredients: [{ name: "鮭", quantity: "1切れ" }],
    });
  });

  it("decodes HTML entities in title and ingredient names", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"親子&amp;丼","recipeIngredient":["鶏もも肉&nbsp;300g"]}
    </script>`;

    const result = extractRecipeFromJsonLd(html);
    expect(result?.title).toBe("親子&丼");
    expect(result?.ingredients[0]).toEqual({
      name: "鶏もも肉",
      quantity: "300g",
    });
  });

  it("caps ingredients at 50 and truncates overly long names", () => {
    const ingredients = Array.from({ length: 60 }, (_, i) => `材料${i}`);
    const longName = "あ".repeat(150);
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":${JSON.stringify(longName)},"recipeIngredient":${JSON.stringify(ingredients)}}
    </script>`;

    const result = extractRecipeFromJsonLd(html);
    expect(result?.title).toHaveLength(100);
    expect(result?.ingredients).toHaveLength(50);
  });

  it("returns null when the recipe has no usable name", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","recipeIngredient":["卵 1個"]}
    </script>`;
    expect(extractRecipeFromJsonLd(html)).toBeNull();
  });

  it("returns null for a Recipe node with a name but no recipeIngredient (roundup pages)", () => {
    // 実サイトで確認したパターン: まとめ記事に@type:Recipeが付与され、
    // nameはページ自体のタイトル、recipeIngredientは存在しない。
    // これを採用すると材料0件で「成功」扱いになりGeminiフォールバックが働かなくなるため、
    // 材料が空のRecipeノードは不採用にする。
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"鶏むね肉の人気レシピ特集","description":"..."}
    </script>`;
    expect(extractRecipeFromJsonLd(html)).toBeNull();
  });

  it("falls through to a later Recipe node when an earlier one has no ingredients", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Recipe","name":"まとめ記事"}</script>
      <script type="application/ld+json">{"@type":"Recipe","name":"本命レシピ","recipeIngredient":["鶏むね肉 1枚"]}</script>
    `;
    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "本命レシピ",
      servings: "",
      ingredients: [{ name: "鶏むね肉", quantity: "1枚" }],
    });
  });
});

describe("extractReadable", () => {
  it("prefers og:title when present", () => {
    const html = `<html><head>
      <title>サイトの汎用タイトル</title>
      <meta property="og:title" content="鶏の照り焼きレシピ" />
      </head><body>本文</body></html>`;

    expect(extractReadable(html).title).toBe("鶏の照り焼きレシピ");
  });

  it("falls back to <title> when og:title is absent", () => {
    const html =
      "<html><head><title>汎用タイトル</title></head><body>本文</body></html>";
    expect(extractReadable(html).title).toBe("汎用タイトル");
  });

  it("excludes script and style contents from the extracted text", () => {
    const html = `<html><head><style>.a{color:red}</style></head>
      <body><script>var secret = "hidden";</script><p>鶏もも肉 300g</p></body></html>`;

    const { text } = extractReadable(html);
    expect(text).toContain("鶏もも肉 300g");
    expect(text).not.toContain("hidden");
    expect(text).not.toContain("color:red");
  });

  it("truncates the extracted text to 8000 characters", () => {
    const html = `<body><p>${"あ".repeat(9000)}</p></body>`;
    expect(extractReadable(html).text).toHaveLength(8000);
  });
});

describe("fetchHtml", () => {
  afterEach(() => {
    guardedGet.mockReset();
  });

  function htmlResponse(
    html: string | Uint8Array,
    contentType = "text/html; charset=utf-8",
  ) {
    return {
      status: 200,
      headers: { "content-type": contentType },
      body: Readable.from([Buffer.from(html)]),
    };
  }

  function redirectResponse(location: string | undefined) {
    return {
      status: 302,
      headers: { location },
      body: Readable.from([]),
    };
  }

  async function run(url: string, deadlineAt = Date.now() + 5000) {
    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    return fetchHtml(url, { deadlineAt });
  }

  function requestedUrls() {
    return guardedGet.mock.calls.map(([url]) => String(url));
  }

  it("rejects a non-https URL without sending a request", async () => {
    const result = await run("http://example.com/recipe");

    expect(result).toEqual({ ok: false });
    expect(guardedGet).not.toHaveBeenCalled();
  });

  it("returns the HTML of a 200 text/html response", async () => {
    guardedGet.mockResolvedValue(htmlResponse("<html>レシピ</html>"));

    const result = await run("https://example.com/recipe");

    expect(result).toEqual({ ok: true, html: "<html>レシピ</html>" });
    expect(requestedUrls()).toEqual(["https://example.com/recipe"]);
  });

  it("fails when the guarded request refuses the host", async () => {
    guardedGet.mockRejectedValue(new Error("blocked"));

    const result = await run("https://internal.example.com/recipe");

    expect(result).toEqual({ ok: false });
  });

  it("rejects a non-HTML content-type and discards the body", async () => {
    const response = htmlResponse("{}", "application/json");
    guardedGet.mockResolvedValue(response);

    const result = await run("https://example.com/recipe.json");

    expect(result).toEqual({ ok: false });
    expect(response.body.destroyed).toBe(true);
  });

  it("rejects a non-2xx response", async () => {
    guardedGet.mockResolvedValue({
      ...htmlResponse("<html>not found</html>"),
      status: 404,
    });

    expect(await run("https://example.com/missing")).toEqual({ ok: false });
  });

  it("follows a redirect through the guarded request and returns the final HTML", async () => {
    guardedGet
      .mockResolvedValueOnce(redirectResponse("/final"))
      .mockResolvedValueOnce(htmlResponse("<html>final</html>"));

    const result = await run("https://example.com/recipe");

    expect(result).toEqual({ ok: true, html: "<html>final</html>" });
    expect(requestedUrls()).toEqual([
      "https://example.com/recipe",
      "https://example.com/final",
    ]);
  });

  it("fails when the guarded request refuses a redirect target", async () => {
    guardedGet
      .mockResolvedValueOnce(redirectResponse("https://internal.example.com/x"))
      .mockRejectedValueOnce(new Error("blocked"));

    const result = await run("https://example.com/recipe");

    expect(result).toEqual({ ok: false });
    expect(requestedUrls()).toEqual([
      "https://example.com/recipe",
      "https://internal.example.com/x",
    ]);
  });

  it("rejects a redirect to a non-https location", async () => {
    guardedGet.mockResolvedValue(redirectResponse("http://example.com/final"));

    const result = await run("https://example.com/recipe");

    expect(result).toEqual({ ok: false });
    expect(guardedGet).toHaveBeenCalledTimes(1);
  });

  it("rejects a redirect without a location header", async () => {
    guardedGet.mockResolvedValue(redirectResponse(undefined));

    expect(await run("https://example.com/recipe")).toEqual({ ok: false });
  });

  it("gives up after exceeding the maximum number of redirects", async () => {
    guardedGet.mockImplementation(async () =>
      redirectResponse("https://example.com/next"),
    );

    const result = await run("https://example.com/recipe");

    expect(result).toEqual({ ok: false });
    // 初回 + リダイレクト3回 = 4回まで
    expect(guardedGet).toHaveBeenCalledTimes(4);
  });

  it("stops reading once the body exceeds the 1MB cap", async () => {
    const response = htmlResponse(new Uint8Array(1_100_000), "text/html");
    guardedGet.mockResolvedValue(response);

    const result = await run("https://example.com/recipe");

    expect(result).toEqual({ ok: false });
    expect(response.body.destroyed).toBe(true);
  });

  it("fails when the body stream errors partway", async () => {
    const body = new Readable({ read() {} });
    guardedGet.mockResolvedValue({ ...htmlResponse(""), body });
    body.destroy(new Error("aborted"));

    expect(await run("https://example.com/recipe")).toEqual({ ok: false });
  });

  it("fails immediately when the deadline has already passed", async () => {
    const result = await run("https://example.com/recipe", Date.now() - 1);

    expect(result).toEqual({ ok: false });
    expect(guardedGet).not.toHaveBeenCalled();
  });

  it("caps each request's timeout at 5 seconds and at the remaining deadline", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    guardedGet.mockImplementation(async () => htmlResponse("<html></html>"));

    await run("https://example.com/recipe", Date.now() + 60_000);
    await run("https://example.com/recipe", Date.now() + 1_000);

    expect(timeout.mock.calls[0]?.[0]).toBe(5_000);
    expect(timeout.mock.calls[1]?.[0]).toBeLessThanOrEqual(1_000);
    expect(guardedGet.mock.calls[0]?.[1].signal).toBe(
      timeout.mock.results[0]?.value,
    );
    timeout.mockRestore();
  });
});
