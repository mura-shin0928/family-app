/**
 * デジタル庁デザインシステム（DADS）のトークンのうち、このアプリで使う値。
 * 名前は DADS のトークン名を縮めたもの（color-neutral-solid-gray-50 → gray50）。
 * 用途で名付けたものは元のトークンを右に書いている。DADS はライトテーマのみ。
 */
export const dads = {
  white: "#ffffff",
  black: "#000000",
  gray50: "#f2f2f2",
  gray100: "#e6e6e6",
  gray200: "#cccccc",
  gray300: "#b3b3b3",
  gray400: "#999999",
  gray420: "#949494",
  gray500: "#7f7f7f",
  gray600: "#666666",
  gray700: "#4d4d4d",
  gray800: "#333333",
  gray900: "#1a1a1a",
  key50: "#e8f1fe",
  key100: "#d9e6ff",
  key200: "#c5d7fb",
  key300: "#9db7f9",
  key900: "#0017c1",
  key1000: "#00118f",
  key1200: "#000060",
  linkVisited: "#8b008b", // primitive-magenta-900
  linkActive: "#c74700", // primitive-orange-800
  focusYellow: "#ffd43d", // primitive-yellow-300
  success: "#197a4b", // semantic-success-2
  successDark: "#0c472a", // primitive-green-1000
  error: "#ec0000", // semantic-error-1
  errorDark: "#ce0000", // semantic-error-2
  warning: "#927200", // semantic-warning-yellow-2
  warningDark: "#806300", // primitive-yellow-1000
  overlay: "rgba(0, 0, 0, 0.6)", // neutral-opacity-gray-600
  hover: "rgba(0, 0, 0, 0.05)", // neutral-opacity-gray-50
} as const;
