import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { createTheme, type PaletteOptions } from "@mui/material/styles";
import { createElement } from "react";
import { type BrandScheme, brand } from "./brand";
import { dads } from "./dads";

/** ライト・ダークで値が変わる役割色。palette.brand に入れて CSS 変数で参照する。 */
type BrandRoles = {
  heading: string;
  line: string;
  lineStrong: string;
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
};

declare module "@mui/material/styles" {
  interface Palette {
    brand: BrandRoles;
  }
  interface PaletteOptions {
    brand?: BrandRoles;
  }
}

/** palette の値を CSS 変数で参照する。OS の設定でライト・ダークが切り替わっても追従する。 */
const v = (path: string) => `var(--mui-palette-${path})`;

// 下線状の影。ポップアップ類だけ、背景から浮かせるための柔らかい影を1つ足す。
const line = "0 2px 0 rgba(43,41,38,0.14)";
const popup = `${line}, 0 8px 24px rgba(0,0,0,0.18)`;
const hitArea = {
  position: "relative",
  "&::after": {
    content: '""',
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 44,
    height: 44,
    transform: "translate(-50%, -50%)",
  },
} as const;

const elevation = [
  "none",
  line,
  line,
  popup,
  popup,
  popup,
  popup,
  popup,
  popup,
] as const;

// DADS のフォーカスリング（外枠 4px + 黄 2px の内枠）。ライトの外枠は黒、ダークは背景に埋もれないよう白。
const focusRing = {
  outline: `4px solid ${v("brand-focusOuter")}`,
  outlineOffset: "2px",
  boxShadow: `0 0 0 2px ${v("brand-focusInner")}`,
} as const;

/** DADS のテキストスタイル「カテゴリー-サイズ・ウェイト-行間」を MUI の variant に当てる。 */
function textStyle(
  px: number,
  weight: 400 | 700,
  lineHeight: number,
  letterSpacing?: string,
) {
  return {
    fontSize: `${px / 16}rem`,
    fontWeight: weight,
    lineHeight,
    ...(letterSpacing ? { letterSpacing } : {}),
  };
}

const grey = {
  50: dads.gray50,
  100: dads.gray100,
  200: dads.gray200,
  300: dads.gray300,
  400: dads.gray400,
  500: dads.gray500,
  600: dads.gray600,
  700: dads.gray700,
  800: dads.gray800,
  900: dads.gray900,
};

function paletteFrom(c: BrandScheme): PaletteOptions {
  return {
    primary: {
      main: c.primary,
      dark: c.primaryDark,
      light: c.primaryLight,
      contrastText: c.onPrimary,
    },
    success: { main: c.success, dark: c.successDark, contrastText: c.onStatus },
    error: { main: c.error, dark: c.errorDark, contrastText: c.onStatus },
    warning: { main: c.warning, dark: c.warningDark, contrastText: c.onStatus },
    info: { main: c.primary, dark: c.primaryDark, contrastText: c.onPrimary },
    grey,
    text: {
      primary: c.text,
      secondary: c.textSecondary,
      disabled: c.textDisabled,
    },
    divider: c.divider,
    background: { default: c.background, paper: c.paper },
    action: {
      active: c.actionActive,
      hover: dads.hover,
      disabled: c.textDisabled,
      disabledBackground: c.actionDisabledBg,
    },
    brand: {
      heading: c.heading,
      line: c.inputLine,
      lineStrong: c.lineStrong,
      focusOuter: c.focusOuter,
      focusInner: c.focusInner,
      containedActiveBg: c.containedActiveBg,
      disabledFill: c.disabledFill,
      onDisabledFill: c.onDisabledFill,
      disabledLine: c.disabledLine,
      disabledInputBg: c.disabledInputBg,
      outlinedHoverBg: c.outlinedHoverBg,
      outlinedActiveBg: c.outlinedActiveBg,
      textHoverBg: c.textHoverBg,
      textActiveBg: c.textActiveBg,
      onTintHover: c.onTintHover,
      onTintActive: c.onTintActive,
      link: c.link,
      linkHover: c.linkHover,
      linkVisited: c.linkVisited,
      linkActive: c.linkActive,
      linkOnFocus: c.linkOnFocus,
      tagBg: c.tagBg,
      tagText: c.tagText,
    },
  };
}

export const theme = createTheme({
  // OS のライト/ダーク設定に追従させる。手動の切り替え UI は作らない。
  colorSchemes: {
    light: { palette: paletteFrom(brand.light) },
    dark: { palette: paletteFrom(brand.dark) },
  },
  cssVariables: { colorSchemeSelector: "media" },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    ...elevation,
    ...Array<string>(16).fill(elevation[8]),
  ] as unknown as ReturnType<typeof createTheme>["shadows"],
  typography: {
    fontFamily:
      'var(--font-zen-maru-gothic), var(--font-noto-sans-jp), "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif',
    // ウェイトは 400 と 700 の 2 つだけ。見出しは本文より一段濃い色。
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 700,
    fontWeightBold: 700,
    h1: { ...textStyle(36, 700, 1.4, "0.01em"), color: v("brand-heading") }, // Std-36B-140
    h2: { ...textStyle(32, 700, 1.5, "0.01em"), color: v("brand-heading") }, // Std-32B-150
    h3: { ...textStyle(28, 700, 1.5, "0.01em"), color: v("brand-heading") }, // Std-28B-150
    h4: { ...textStyle(24, 700, 1.5, "0.02em"), color: v("brand-heading") }, // Std-24B-150
    h5: { ...textStyle(22, 700, 1.5, "0.02em"), color: v("brand-heading") }, // Std-22B-150
    h6: { ...textStyle(20, 700, 1.5, "0.02em"), color: v("brand-heading") }, // Std-20B-150
    subtitle1: {
      ...textStyle(17, 700, 1.7, "0.02em"),
      color: v("brand-heading"),
    }, // Std-17B-170
    subtitle2: textStyle(14, 700, 1.3), // Dns-14B-130
    body1: textStyle(16, 400, 1.7, "0.02em"), // Std-16N-170
    // 一覧の行など詰めたい本文。DADS は本文を 16px 未満にしないので Dns-16N-130。
    body2: textStyle(16, 400, 1.3), // Dns-16N-130
    caption: textStyle(14, 400, 1.3), // Dns-14N-130
    overline: textStyle(14, 700, 1.3),
    button: { ...textStyle(16, 700, 1, "0.02em"), textTransform: "none" }, // Oln-16B-100
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // 波紋エフェクトを切っているので、キーボード操作時の表示はここで一括して出す。
        ":focus-visible, .Mui-focusVisible": focusRing,
        // テキスト入力はタップでも :focus-visible になり二重リングが重いので、
        // リングは出さず枠線・下線をキーカラーの 2px にして示す（DADS からの逸脱）。
        ".MuiInputBase-input:focus-visible": {
          outline: "none",
          boxShadow: "none",
        },
      },
    },
    // 丸いチェック。未選択は輪、選択済みは主色の塗り。
    MuiCheckbox: {
      defaultProps: {
        icon: createElement(RadioButtonUncheckedIcon),
        checkedIcon: createElement(CheckCircleIcon),
      },
      styleOverrides: {
        root: { variants: [{ props: { size: "small" }, style: hitArea }] },
      },
    },
    // small は見た目を詰めたまま、当たり判定だけ 44px 角に広げる。
    MuiIconButton: {
      styleOverrides: {
        root: { variants: [{ props: { size: "small" }, style: hitArea }] },
      },
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textUnderlineOffset: "3px",
          // MUI の size を高さの近い DADS のサイズに当てる（small→xs, medium→sm, large→md）。
          variants: [
            {
              props: { size: "small" },
              style: {
                minWidth: 72,
                minHeight: 28,
                padding: "2px 8px",
                borderRadius: 12,
                fontSize: "0.875rem",
              },
            },
            {
              props: { size: "medium" },
              style: {
                minWidth: 80,
                minHeight: 36,
                padding: "2px 12px",
                borderRadius: 16,
              },
            },
            {
              props: { size: "large" },
              style: {
                minWidth: 96,
                minHeight: 48,
                padding: "8px 16px",
                borderRadius: 16,
              },
            },
            {
              props: { variant: "contained" },
              style: {
                "&:hover": {
                  textDecoration: "underline",
                  textDecorationThickness: "1px",
                },
                "&.Mui-disabled": {
                  backgroundColor: v("brand-disabledFill"),
                  color: v("brand-onDisabledFill"),
                },
              },
            },
            {
              props: { variant: "contained", color: "primary" },
              style: {
                "&:active": { backgroundColor: v("brand-containedActiveBg") },
              },
            },
            {
              props: { variant: "outlined" },
              style: {
                borderColor: "currentColor",
                backgroundColor: v("background-paper"),
                "&:hover": {
                  borderColor: "currentColor",
                  textDecoration: "underline",
                  textDecorationThickness: "1px",
                },
                "&.Mui-disabled": {
                  borderColor: v("brand-disabledLine"),
                  color: v("brand-disabledLine"),
                },
              },
            },
            {
              props: { variant: "outlined", color: "primary" },
              style: {
                "&:hover": {
                  backgroundColor: v("brand-outlinedHoverBg"),
                  color: v("brand-onTintHover"),
                },
                "&:active": {
                  backgroundColor: v("brand-outlinedActiveBg"),
                  color: v("brand-onTintActive"),
                },
              },
            },
            // DADS のテキストボタンは常に下線付き。
            {
              props: { variant: "text" },
              style: {
                textDecoration: "underline",
                textDecorationThickness: "1px",
                "&:hover": {
                  textDecoration: "underline",
                  textDecorationThickness: "3px",
                },
                "&.Mui-disabled": { textDecoration: "none" },
              },
            },
            {
              props: { variant: "text", color: "primary" },
              style: {
                "&:hover": {
                  backgroundColor: v("brand-textHoverBg"),
                  color: v("brand-onTintHover"),
                },
                "&:active": {
                  backgroundColor: v("brand-textActiveBg"),
                  color: v("brand-onTintActive"),
                },
              },
            },
          ],
        },
      },
    },
    MuiLink: {
      defaultProps: { underline: "always" },
      styleOverrides: {
        root: {
          color: v("brand-link"),
          textDecorationColor: "currentColor",
          textDecorationThickness: "1px",
          textUnderlineOffset: "3px",
          "&:visited": { color: v("brand-linkVisited") },
          "&:hover": {
            color: v("brand-linkHover"),
            textDecorationThickness: "3px",
          },
          "&:active": {
            color: v("brand-linkActive"),
            textDecorationThickness: "1px",
          },
          "&:focus-visible": {
            borderRadius: 4,
            backgroundColor: v("brand-focusInner"),
            color: v("brand-linkOnFocus"),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: { borderColor: v("divider"), boxShadow: line },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorDefault: {
          backgroundColor: v("background-default"),
          color: v("brand-heading"),
          borderBottom: `1px solid ${v("divider")}`,
        },
      },
    },
    MuiChip: {
      defaultProps: {
        size: "small",
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          letterSpacing: "0.02em",
          variants: [
            { props: { size: "small" }, style: { fontSize: "0.875rem" } },
            { props: { size: "medium" }, style: { fontSize: "1rem" } },
            // 既定の枠（grey[400]）は白地で 3:1 に届かないので、DADS のコンポーネント境界線の色に。
            {
              props: { variant: "outlined", color: "default" },
              style: { borderColor: v("brand-line") },
            },
            {
              props: { variant: "filled", color: "default" },
              style: {
                backgroundColor: v("brand-tagBg"),
                color: v("brand-tagText"),
              },
            },
          ],
        },
      },
    },
    // DADS のノティフィケーションバナー：地の色に 3px の枠。色はアイコンと枠だけに使う。
    MuiAlert: {
      styleOverrides: {
        message: textStyle(16, 400, 1.5),
        root: ({ ownerState, theme }) => {
          if (ownerState.variant !== "standard") return {};
          const color = ownerState.color ?? ownerState.severity ?? "success";
          return {
            borderRadius: 16,
            border: `3px solid ${theme.vars?.palette[color].main}`,
            backgroundColor: v("background-paper"),
            color: v("text-primary"),
          };
        },
      },
    },
    // 以下は MUI が body2 や固定の px で文字を組む部品。DADS の本文の行間（150% 以上）と最小 14px に合わせる。
    MuiSnackbarContent: {
      styleOverrides: { message: textStyle(16, 400, 1.5) },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: textStyle(14, 400, 1.5) },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, boxShadow: elevation[3] },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: textStyle(24, 700, 1.5, "0.02em"),
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { invisible: false },
              style: { backgroundColor: dads.overlay },
            },
          ],
        },
      },
    },
    // ポップアップ類は背景から浮かせるため、柔らかい影を含む段階にする。
    MuiPopover: {
      styleOverrides: { paper: { boxShadow: elevation[3] } },
    },
    MuiAutocomplete: {
      styleOverrides: { paper: { boxShadow: elevation[3] } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: v("brand-line"),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: v("brand-lineStrong"),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: v("primary-main"),
            borderWidth: 2,
          },
          "&.Mui-disabled": { backgroundColor: v("brand-disabledInputBg") },
          "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
            borderColor: v("brand-disabledLine"),
          },
        },
      },
    },
    // iOS Safariはフォーム要素のフォントサイズが16px未満だとフォーカス時に
    // 自動ズームする。size="small"等でも入力中の文字は16px以上を保つため、
    // 個々のTextField側ではなくここで下限を固定する。
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: "1rem",
          color: v("text-primary"),
          // iOS Safari は日付を中央に寄せるので、他の入力欄と同じ左寄せにする。
          "&[type='date']": { textAlign: "left" },
          "&[type='date']::-webkit-date-and-time-value": { textAlign: "left" },
          // PC のネイティブのアイコンは隠し、欄全体をピッカーを開く面にする
          // （右端のアイコンは DateField が出す）。
          "&[type='date']::-webkit-calendar-picker-indicator": {
            position: "absolute",
            inset: 0,
            width: "auto",
            height: "auto",
            opacity: 0,
            cursor: "pointer",
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          ...textStyle(16, 400, 1.2),
          color: v("text-primary"),
          "&.Mui-selected": { color: v("brand-heading"), fontWeight: 700 },
        },
      },
    },
    // DADS のタブは上端 6px のバーだが、MUI の下線タブに合わせて下端 4px（下部ナビの選択バーと同じ）。
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 4, backgroundColor: v("primary-main") },
      },
    },
  },
});
