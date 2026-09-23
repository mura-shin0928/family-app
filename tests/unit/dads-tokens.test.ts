import tokens from "@digital-go-jp/design-tokens";
import { describe, expect, it } from "vitest";
import { dads } from "@/lib/dads";

const { Primitive, Neutral, Semantic, Key } = tokens.Color;

// src/lib/dads.ts の各値が、公式トークンのどれに当たるか。
const source: Record<keyof typeof dads, { $value?: string }> = {
  white: Neutral.White,
  black: Neutral.Black,
  gray50: Neutral.SolidGray["50"],
  gray100: Neutral.SolidGray["100"],
  gray200: Neutral.SolidGray["200"],
  gray300: Neutral.SolidGray["300"],
  gray400: Neutral.SolidGray["400"],
  gray420: Neutral.SolidGray["420"],
  gray500: Neutral.SolidGray["500"],
  gray600: Neutral.SolidGray["600"],
  gray700: Neutral.SolidGray["700"],
  gray800: Neutral.SolidGray["800"],
  gray900: Neutral.SolidGray["900"],
  key50: Key["50"],
  key100: Key["100"],
  key200: Key["200"],
  key300: Key["300"],
  key900: Key["900"],
  key1000: Key["1000"],
  key1200: Key["1200"],
  green200: Primitive.Green["200"],
  green300: Primitive.Green["300"],
  red200: Primitive.Red["200"],
  red300: Primitive.Red["300"],
  yellow200: Primitive.Yellow["200"],
  magenta300: Primitive.Magenta["300"],
  orange300: Primitive.Orange["300"],
  linkVisited: Primitive.Magenta["900"],
  linkActive: Primitive.Orange["800"],
  focusYellow: Primitive.Yellow["300"],
  success: Semantic.Success["2"],
  successDark: Primitive.Green["1000"],
  error: Semantic.Error["1"],
  errorDark: Semantic.Error["2"],
  warning: Semantic.Warning.Yellow["2"],
  warningDark: Primitive.Yellow["1000"],
  overlay: Neutral.OpacityGray["600"],
  hover: Neutral.OpacityGray["50"],
};

describe("dads", () => {
  it.each(
    Object.entries(source),
  )("%s は @digital-go-jp/design-tokens の値と一致する", (key, token) => {
    expect(dads[key as keyof typeof dads]).toBe(token.$value);
  });
});
