import { describe, expect, it } from "vitest";
import { type BrandScheme, brand } from "@/lib/brand";

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Key = keyof BrandScheme;
// [前景, 背景, 最小比]。文字は 4.5、操作部品の枠線・フォーカスは 3。
const pairs: [Key, Key, number][] = [
  ["text", "background", 4.5],
  ["text", "paper", 4.5],
  ["text", "tagBg", 4.5],
  ["textSecondary", "background", 4.5],
  ["textSecondary", "paper", 4.5],
  ["heading", "background", 4.5],
  ["heading", "paper", 4.5],
  ["primary", "background", 4.5],
  ["primary", "paper", 4.5],
  ["primaryDark", "background", 4.5],
  ["onPrimary", "primary", 4.5],
  ["onPrimary", "containedActiveBg", 4.5],
  ["tagText", "tagBg", 4.5],
  ["link", "background", 4.5],
  ["link", "paper", 4.5],
  ["linkHover", "background", 4.5],
  ["linkVisited", "background", 4.5],
  ["linkActive", "background", 4.5],
  ["success", "background", 4.5],
  ["success", "paper", 4.5],
  ["error", "background", 4.5],
  ["error", "paper", 4.5],
  ["warning", "background", 4.5],
  ["warning", "paper", 4.5],
  ["onStatus", "success", 4.5],
  ["onStatus", "error", 4.5],
  ["onStatus", "warning", 4.5],
  ["onTintHover", "outlinedHoverBg", 4.5],
  ["onTintActive", "outlinedActiveBg", 4.5],
  ["onTintHover", "textHoverBg", 4.5],
  ["onTintActive", "textActiveBg", 4.5],
  ["inputLine", "background", 3],
  ["inputLine", "paper", 3],
  ["lineStrong", "paper", 3],
  ["focusOuter", "background", 3],
];

describe.each(Object.entries(brand))("brand.%s", (_scheme, colors) => {
  it.each(pairs)("%s / %s は %f:1 以上", (fg, bg, min) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });

  it("paper と background は別の色", () => {
    expect(colors.paper).not.toBe(colors.background);
  });
});
