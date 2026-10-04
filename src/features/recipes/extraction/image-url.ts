import { metaContent } from "./html-text";
import { findRecipeNodes } from "./jsonld";

// recipes.image_url のDB制約と揃える。
export const MAX_IMAGE_URL_LENGTH = 2000;

// schema.orgのimageは URL文字列 / ImageObject / それらの配列のいずれでも来る。
function collectImageCandidates(value: unknown, into: string[]) {
  if (typeof value === "string") {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImageCandidates(item, into);
    return;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    collectImageCandidates(obj.url ?? obj.contentUrl, into);
  }
}

function toHttpsUrl(candidate: string, pageUrl: string): string | null {
  const trimmed = candidate.trim();
  if (trimmed === "") return null;

  let url: URL;
  try {
    url = new URL(trimmed, pageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  return url.href.length <= MAX_IMAGE_URL_LENGTH ? url.href : null;
}

/**
 * HTML文字列からレシピの代表画像のURLを取り出す。純関数（I/Oなし）。
 * JSON-LDのRecipe.image → og:image の順に探し、https の絶対URLだけを返す。
 */
export function extractImageUrl(html: string, pageUrl: string): string | null {
  const candidates: string[] = [];
  for (const recipe of findRecipeNodes(html)) {
    collectImageCandidates(recipe.image, candidates);
  }

  const ogImage = metaContent(html, "og:image");
  if (ogImage) candidates.push(ogImage);

  for (const candidate of candidates) {
    const url = toHttpsUrl(candidate, pageUrl);
    if (url) return url;
  }
  return null;
}
