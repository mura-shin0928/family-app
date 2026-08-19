import { afterEach, describe, expect, it, vi } from "vitest";
import { isSnsHost } from "@/features/recipes/extraction/detect";
import { extractRecipeFromJsonLd } from "@/features/recipes/extraction/jsonld";
import { extractReadable } from "@/features/recipes/extraction/readable";
import { splitIngredientNameAndQuantity } from "@/features/recipes/extraction/split-ingredient";

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
      ingredients: [
        { name: "鶏もも肉", quantity: "300g" },
        { name: "白菜", quantity: "1/4個" },
      ],
    });
  });

  it("extracts from an array-rooted JSON-LD document", () => {
    const html = `<script type="application/ld+json">
      [{"@type":"BreadcrumbList"},{"@type":"Recipe","name":"カレー","recipeIngredient":["カレールー 1箱"]}]
    </script>`;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "カレー",
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
      ingredients: [{ name: "味噌", quantity: "大さじ2" }],
    });
  });

  it("matches when @type is an array containing Recipe", () => {
    const html = `<script type="application/ld+json">
      {"@type":["Recipe","Thing"],"name":"炒飯","recipeIngredient":["卵 2個"]}
    </script>`;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "炒飯",
      ingredients: [{ name: "卵", quantity: "2個" }],
    });
  });

  it("accepts a single string for recipeIngredient", () => {
    const html = `<script type="application/ld+json">
      {"@type":"Recipe","name":"目玉焼き","recipeIngredient":"卵 1個"}
    </script>`;

    expect(extractRecipeFromJsonLd(html)).toEqual({
      title: "目玉焼き",
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
  const dnsLookup = vi.hoisted(() => vi.fn());
  vi.mock("node:dns/promises", () => ({ lookup: dnsLookup }));

  afterEach(() => {
    vi.unstubAllGlobals();
    dnsLookup.mockReset();
  });

  function htmlResponse(
    html: string,
    contentType = "text/html; charset=utf-8",
  ) {
    const bytes = new TextEncoder().encode(html);
    let sent = false;
    return {
      ok: true,
      status: 200,
      headers: {
        get: (key: string) => (key === "content-type" ? contentType : null),
      },
      body: {
        getReader: () => ({
          read: async () => {
            if (sent) return { done: true, value: undefined };
            sent = true;
            return { done: false, value: bytes };
          },
          cancel: async () => {},
        }),
      },
    };
  }

  function redirectResponse(location: string) {
    return {
      ok: false,
      status: 302,
      headers: { get: (key: string) => (key === "location" ? location : null) },
      body: null,
    };
  }

  it("rejects a non-https URL without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("http://example.com/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects the localhost hostname without a DNS lookup", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://localhost/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dnsLookup).not.toHaveBeenCalled();
  });

  it("rejects when DNS resolves the hostname to a private IP", async () => {
    dnsLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://internal.example.com/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("succeeds when DNS resolves to a public IP and the response is HTML", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(htmlResponse("<html>ok</html>")),
    );

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://example.com/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: true, html: "<html>ok</html>" });
  });

  it("rejects a non-HTML content-type", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(htmlResponse("{}", "application/json")),
    );

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://example.com/recipe.json", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: false });
  });

  it("follows a redirect to a safe host and returns its HTML", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse("https://example.com/final"))
      .mockResolvedValueOnce(htmlResponse("<html>final</html>"));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://example.com/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: true, html: "<html>final</html>" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a redirect to a non-https location", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(redirectResponse("http://example.com/final")),
    );

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://example.com/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: false });
  });

  it("gives up after exceeding the maximum number of redirects", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(redirectResponse("https://example.com/next"));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://example.com/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: false });
    // 初回 + リダイレクト3回 = 4回まで
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("rejects a redirect that lands on a private IP", async () => {
    dnsLookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(redirectResponse("https://internal.example.com/x")),
    );

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://example.com/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: false });
  });

  it("aborts once the body exceeds the 1MB cap", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const bigChunk = new Uint8Array(1_100_000);
    const cancel = vi.fn(async () => {});
    let sent = false;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "text/html" },
        body: {
          getReader: () => ({
            read: async () => {
              if (sent) return { done: true, value: undefined };
              sent = true;
              return { done: false, value: bigChunk };
            },
            cancel,
          }),
        },
      }),
    );

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://example.com/recipe", {
      deadlineAt: Date.now() + 5000,
    });

    expect(result).toEqual({ ok: false });
    expect(cancel).toHaveBeenCalled();
  });

  it("fails immediately when the deadline has already passed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchHtml } = await import(
      "@/features/recipes/extraction/fetch-html"
    );
    const result = await fetchHtml("https://example.com/recipe", {
      deadlineAt: Date.now() - 1,
    });

    expect(result).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
