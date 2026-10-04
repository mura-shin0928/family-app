import { describe, expect, it } from "vitest";
import { extractImageUrl } from "@/features/recipes/extraction/image-url";

const PAGE_URL = "https://example.com/recipes/1";

function jsonLd(node: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(node)}</script>`;
}

function recipe(image: unknown) {
  return { "@type": "Recipe", name: "カレー", image };
}

describe("extractImageUrl", () => {
  it("reads a string image from the JSON-LD Recipe", () => {
    const html = jsonLd(recipe("https://cdn.example.com/curry.jpg"));
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/curry.jpg",
    );
  });

  it("takes the first usable entry of an image array", () => {
    const html = jsonLd(
      recipe(["https://cdn.example.com/1x1.jpg", "https://cdn.example.com/b"]),
    );
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/1x1.jpg",
    );
  });

  it("reads the url of an ImageObject", () => {
    const html = jsonLd(
      recipe({ "@type": "ImageObject", url: "https://cdn.example.com/o.jpg" }),
    );
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/o.jpg",
    );
  });

  it("reads an ImageObject inside an array", () => {
    const html = jsonLd(
      recipe([
        { "@type": "ImageObject", url: "https://cdn.example.com/a.jpg" },
      ]),
    );
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });

  it("finds the Recipe node inside @graph", () => {
    const html = jsonLd({
      "@graph": [
        { "@type": "WebSite", image: "https://cdn.example.com/site.jpg" },
        recipe("https://cdn.example.com/graph.jpg"),
      ],
    });
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/graph.jpg",
    );
  });

  it("falls back to og:image when JSON-LD has no image", () => {
    const html = `${jsonLd(recipe(undefined))}
      <meta property="og:image" content="https://cdn.example.com/og.jpg">`;
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/og.jpg",
    );
  });

  it("reads og:image when content comes before property", () => {
    const html = `<meta content="https://cdn.example.com/og.jpg" property="og:image" />`;
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/og.jpg",
    );
  });

  it("decodes HTML entities in og:image", () => {
    const html = `<meta property="og:image" content="https://cdn.example.com/og.jpg?w=600&amp;h=400">`;
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/og.jpg?w=600&h=400",
    );
  });

  it("resolves relative and protocol-relative URLs against the page URL", () => {
    expect(
      extractImageUrl(
        `<meta property="og:image" content="/img/curry.jpg">`,
        PAGE_URL,
      ),
    ).toBe("https://example.com/img/curry.jpg");
    expect(
      extractImageUrl(
        `<meta property="og:image" content="//cdn.example.com/c.jpg">`,
        PAGE_URL,
      ),
    ).toBe("https://cdn.example.com/c.jpg");
  });

  it("skips non-https candidates and uses the next one", () => {
    const html = `${jsonLd(recipe("http://cdn.example.com/insecure.jpg"))}
      <meta property="og:image" content="https://cdn.example.com/og.jpg">`;
    expect(extractImageUrl(html, PAGE_URL)).toBe(
      "https://cdn.example.com/og.jpg",
    );
  });

  it("rejects data: and javascript: URLs", () => {
    expect(
      extractImageUrl(
        `<meta property="og:image" content="data:image/png;base64,AAAA">`,
        PAGE_URL,
      ),
    ).toBeNull();
    expect(
      extractImageUrl(
        `<meta property="og:image" content="javascript:alert(1)">`,
        PAGE_URL,
      ),
    ).toBeNull();
  });

  it("rejects URLs longer than the column limit", () => {
    const long = `https://cdn.example.com/${"a".repeat(2000)}.jpg`;
    expect(
      extractImageUrl(`<meta property="og:image" content="${long}">`, PAGE_URL),
    ).toBeNull();
  });

  it("returns null when the page has no image", () => {
    expect(
      extractImageUrl("<html><body>no image</body></html>", PAGE_URL),
    ).toBeNull();
  });
});
