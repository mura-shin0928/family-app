const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * jsonld.ts / readable.ts で共通に使う最小限のHTMLエンティティデコード。
 * 完全なHTMLパーサは入れない方針のため、レシピサイトの本文でよく見る範囲に絞る。
 */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === "#") {
      const codePoint =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      if (Number.isNaN(codePoint)) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

const META_TAG_REGEX = /<meta\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
const ATTRIBUTE_REGEX =
  /([^\s"'=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

/**
 * <meta property="..." content="..."> の content を返す（og:title, og:image など）。
 * property の代わりに name で書かれたタグも対象。該当がなければ null。
 */
export function metaContent(html: string, key: string): string | null {
  for (const [tag] of html.matchAll(META_TAG_REGEX)) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(ATTRIBUTE_REGEX)) {
      attributes.set(
        match[1].toLowerCase(),
        match[2] ?? match[3] ?? match[4] ?? "",
      );
    }

    const tagKey = attributes.get("property") ?? attributes.get("name");
    if (tagKey?.toLowerCase() !== key) continue;

    const content = decodeHtmlEntities(attributes.get("content") ?? "").trim();
    if (content !== "") return content;
  }
  return null;
}

/**
 * script/style の中身ごと除去してからタグを剥がす。
 * <script>内のJSに"<div>"のような文字列が混ざっても本文として拾わないため。
 */
export function stripTagsToText(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withoutTags = withoutNoise.replace(/<[^>]*>/g, " ");
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}
