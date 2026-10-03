import { dads } from "./dads";

/** 役割ごとの色。値の組み合わせのコントラストは tests/unit/brand-contrast.test.ts で確かめる。 */
export type BrandScheme = {
  background: string;
  paper: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  onPrimary: string;
  success: string;
  successDark: string;
  error: string;
  errorDark: string;
  warning: string;
  warningDark: string;
  onStatus: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  /** カードの区切りなど装飾の線。操作部品の枠には inputLine を使う */
  divider: string;
  inputLine: string;
  lineStrong: string;
  heading: string;
  focusOuter: string;
  focusInner: string;
  containedActiveBg: string;
  disabledFill: string;
  onDisabledFill: string;
  disabledLine: string;
  disabledInputBg: string;
  outlinedHoverBg: string;
  outlinedActiveBg: string;
  textHoverBg: string;
  textActiveBg: string;
  onTintHover: string;
  onTintActive: string;
  link: string;
  linkHover: string;
  linkVisited: string;
  linkActive: string;
  linkOnFocus: string;
  tagBg: string;
  tagText: string;
  actionActive: string;
  actionDisabledBg: string;
};

const light: BrandScheme = {
  background: "#fffbf7",
  paper: dads.white,
  primary: "#b84f05",
  primaryDark: "#93400a",
  primaryLight: "#f3a570",
  onPrimary: dads.white,
  // 薄い暖色の背景で 4.5:1 を満たす段階（DADS 標準の error-1・warning-yellow-2 は届かない）。
  success: dads.success,
  successDark: dads.successDark,
  error: dads.errorDark,
  errorDark: "#a80000",
  warning: dads.warningDark,
  warningDark: "#6b5200",
  onStatus: dads.white,
  text: "#2b2926",
  textSecondary: "#625d57",
  textDisabled: "#8a847d",
  divider: "#f3e2d3",
  inputLine: "#857b72",
  lineStrong: "#2b2926",
  heading: "#93400a",
  focusOuter: dads.black,
  focusInner: dads.focusYellow,
  containedActiveBg: "#7a3300",
  disabledFill: dads.gray300,
  onDisabledFill: dads.gray50,
  disabledLine: dads.gray300,
  disabledInputBg: dads.gray50,
  outlinedHoverBg: "#ffe9d6",
  outlinedActiveBg: "#fbd3b3",
  textHoverBg: "#ffe9d6",
  textActiveBg: "#fbd3b3",
  onTintHover: "#8a3d00",
  onTintActive: "#6f2f00",
  link: "#93400a",
  linkHover: "#b84f05",
  linkVisited: dads.linkVisited,
  linkActive: "#6f2f00",
  linkOnFocus: "#6f2f00",
  tagBg: "#ffe9d6",
  tagText: "#8a3d00",
  actionActive: "#625d57",
  actionDisabledBg: dads.gray300,
};

const dark: BrandScheme = {
  background: "#211f1c",
  paper: "#2c2a26",
  primary: "#f3a56b",
  primaryDark: "#f8c49b",
  primaryLight: "#fbdcc0",
  onPrimary: "#211f1c",
  success: dads.green300,
  successDark: dads.green200,
  error: dads.red300,
  errorDark: dads.red200,
  warning: dads.focusYellow,
  warningDark: dads.yellow200,
  onStatus: "#211f1c",
  text: "#f5f2ee",
  textSecondary: "#cfc9c2",
  textDisabled: "#8a847d",
  divider: "#57524b",
  inputLine: "#a9a29a",
  lineStrong: "#f5f2ee",
  heading: "#f8c49b",
  focusOuter: dads.white,
  focusInner: dads.focusYellow,
  containedActiveBg: "#fbdcc0",
  disabledFill: dads.gray700,
  onDisabledFill: dads.gray400,
  disabledLine: dads.gray600,
  disabledInputBg: dads.gray800,
  outlinedHoverBg: "#3e2f22",
  outlinedActiveBg: "#52402d",
  textHoverBg: "#3e2f22",
  textActiveBg: "#52402d",
  onTintHover: "#f8c49b",
  onTintActive: "#fbdcc0",
  link: "#f3a56b",
  linkHover: "#f8c49b",
  linkVisited: dads.magenta300,
  linkActive: dads.orange300,
  // 黄色の背景に載るので、ダークでもフォーカス中のリンク文字は暗い色にする。
  linkOnFocus: dads.black,
  tagBg: "#3e2f22",
  tagText: "#f8c49b",
  actionActive: "#cfc9c2",
  actionDisabledBg: dads.gray700,
};

export const brand = { light, dark };

/** マスコット「おうちくん」の色。ライト・ダークで変えない（背景に載せる絵なので）。 */
export const mascotColors = {
  body: "#ffd9b5",
  roof: "#ec7f43",
  chimney: "#d9652b",
  cheek: "#f59a7a",
  eye: "#5a2a0a",
  cup: "#ffffff",
} as const;
