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
  background: "#fbf5ec",
  paper: dads.white,
  primary: "#b8451f",
  primaryDark: "#8f3413",
  primaryLight: "#f0a58a",
  onPrimary: dads.white,
  // クリーム地で 4.5:1 を満たす段階（DADS 標準の error-1・warning-yellow-2 は届かない）。
  success: dads.success,
  successDark: dads.successDark,
  error: dads.errorDark,
  errorDark: "#a80000",
  warning: dads.warningDark,
  warningDark: "#6b5200",
  onStatus: dads.white,
  text: "#3b2a20",
  textSecondary: "#6b5546",
  textDisabled: "#8a7563",
  divider: "#e6d5c1",
  inputLine: "#8a7563",
  lineStrong: "#3b2a20",
  heading: "#8f3413",
  focusOuter: dads.black,
  focusInner: dads.focusYellow,
  containedActiveBg: "#7a2c0f",
  disabledFill: dads.gray300,
  onDisabledFill: dads.gray50,
  disabledLine: dads.gray300,
  disabledInputBg: dads.gray50,
  outlinedHoverBg: "#fbe3d6",
  outlinedActiveBg: "#f6cdb8",
  textHoverBg: "#fbe3d6",
  textActiveBg: "#f6cdb8",
  onTintHover: "#8f3413",
  onTintActive: "#7a2c0f",
  link: "#8f3413",
  linkHover: "#b8451f",
  linkVisited: dads.linkVisited,
  linkActive: "#7a2c0f",
  linkOnFocus: "#7a2c0f",
  tagBg: "#fbe3d6",
  tagText: "#8f3413",
  actionActive: "#6b5546",
  actionDisabledBg: dads.gray300,
};

const dark: BrandScheme = {
  background: "#2a211b",
  paper: "#352a23",
  primary: "#f0a58a",
  primaryDark: "#f6c2ae",
  primaryLight: "#fbdccc",
  onPrimary: "#2a211b",
  success: dads.green300,
  successDark: dads.green200,
  error: dads.red300,
  errorDark: dads.red200,
  warning: dads.focusYellow,
  warningDark: dads.yellow200,
  onStatus: "#2a211b",
  text: "#f7ede2",
  textSecondary: "#d9c7b8",
  textDisabled: "#8f7d70",
  divider: "#6b5546",
  inputLine: "#b39d8d",
  lineStrong: "#f7ede2",
  heading: "#f6c2ae",
  focusOuter: dads.white,
  focusInner: dads.focusYellow,
  containedActiveBg: "#fbdccc",
  disabledFill: dads.gray700,
  onDisabledFill: dads.gray400,
  disabledLine: dads.gray600,
  disabledInputBg: dads.gray800,
  outlinedHoverBg: "#4a3226",
  outlinedActiveBg: "#5c3d2d",
  textHoverBg: "#4a3226",
  textActiveBg: "#5c3d2d",
  onTintHover: "#f6c2ae",
  onTintActive: "#fbdccc",
  link: "#f0a58a",
  linkHover: "#f6c2ae",
  linkVisited: dads.magenta300,
  linkActive: dads.orange300,
  // 黄色の背景に載るので、ダークでもフォーカス中のリンク文字は暗い色にする。
  linkOnFocus: dads.black,
  tagBg: "#4a3226",
  tagText: "#f6c2ae",
  actionActive: "#d9c7b8",
  actionDisabledBg: dads.gray700,
};

export const brand = { light, dark };
