import { createTheme, type PaletteOptions } from "@mui/material/styles";
import { dads } from "./dads";

/** ライト・ダークで値が変わる DADS の役割色。palette.dads に入れて CSS 変数で参照する。 */
type DadsRoles = {
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
};

declare module "@mui/material/styles" {
  interface Palette {
    dads: DadsRoles;
  }
  interface PaletteOptions {
    dads?: DadsRoles;
  }
}

/** palette の値を CSS 変数で参照する。OS の設定でライト・ダークが切り替わっても追従する。 */
const v = (path: string) => `var(--mui-palette-${path})`;

const elevation = [
  "none",
  "0 2px 8px 1px rgba(0,0,0,0.1), 0 1px 5px 0 rgba(0,0,0,0.3)",
  "0 2px 12px 2px rgba(0,0,0,0.1), 0 1px 6px 0 rgba(0,0,0,0.3)",
  "0 4px 16px 3px rgba(0,0,0,0.1), 0 1px 6px 0 rgba(0,0,0,0.3)",
  "0 6px 20px 4px rgba(0,0,0,0.1), 0 2px 6px 0 rgba(0,0,0,0.3)",
  "0 8px 24px 5px rgba(0,0,0,0.1), 0 2px 10px 0 rgba(0,0,0,0.3)",
  "0 10px 30px 6px rgba(0,0,0,0.1), 0 3px 12px 0 rgba(0,0,0,0.3)",
  "0 12px 36px 7px rgba(0,0,0,0.1), 0 3px 14px 0 rgba(0,0,0,0.3)",
  "0 14px 40px 7px rgba(0,0,0,0.1), 0 3px 16px 0 rgba(0,0,0,0.3)",
] as const;

// DADS のフォーカスリング（外枠 4px + 黄 2px の内枠）。ライトの外枠は黒、ダークは背景に埋もれないよう白。
const focusRing = {
  outline: `4px solid ${v("dads-focusOuter")}`,
  outlineOffset: "2px",
  boxShadow: `0 0 0 2px ${v("dads-focusInner")}`,
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

const lightPalette: PaletteOptions = {
  primary: {
    main: dads.key900,
    dark: dads.key1000,
    light: dads.key300,
    contrastText: dads.white,
  },
  // 成功・警告は main がテキスト色にも使われるので、白地で 4.5:1 を満たす段階にしている。
  success: {
    main: dads.success,
    dark: dads.successDark,
    contrastText: dads.white,
  },
  error: { main: dads.error, dark: dads.errorDark, contrastText: dads.white },
  warning: {
    main: dads.warning,
    dark: dads.warningDark,
    contrastText: dads.white,
  },
  // DADS の info-1 バナーはキーカラーと同じ blue-900。
  info: { main: dads.key900, dark: dads.key1000, contrastText: dads.white },
  grey,
  text: {
    primary: dads.gray800,
    secondary: dads.gray600,
    disabled: dads.gray420,
  },
  divider: dads.gray420,
  background: { default: dads.white, paper: dads.white },
  action: {
    active: dads.gray600,
    hover: dads.hover,
    disabled: dads.gray420,
    disabledBackground: dads.gray300,
  },
  dads: {
    heading: dads.gray900,
    line: dads.gray600,
    lineStrong: dads.black,
    focusOuter: dads.black,
    focusInner: dads.focusYellow,
    containedActiveBg: dads.key1200,
    disabledFill: dads.gray300,
    onDisabledFill: dads.gray50,
    disabledLine: dads.gray300,
    disabledInputBg: dads.gray50,
    outlinedHoverBg: dads.key200,
    outlinedActiveBg: dads.key300,
    textHoverBg: dads.key50,
    textActiveBg: dads.key100,
    onTintHover: dads.key1000,
    onTintActive: dads.key1200,
    link: dads.key1000,
    linkHover: dads.key900,
    linkVisited: dads.linkVisited,
    linkActive: dads.linkActive,
    linkOnFocus: dads.key1000,
  },
};

// DADS はダークテーマを定義していない。ライトと同じ色相の明るい段階を、
// 背景 gray-900 に対して文字 4.5:1・境界線 3:1 以上になるよう選んでいる。
const darkPalette: PaletteOptions = {
  primary: {
    main: dads.key300,
    dark: dads.key200,
    light: dads.key100,
    contrastText: dads.gray900,
  },
  success: {
    main: dads.green300,
    dark: dads.green200,
    contrastText: dads.gray900,
  },
  error: { main: dads.red300, dark: dads.red200, contrastText: dads.gray900 },
  warning: {
    main: dads.focusYellow,
    dark: dads.yellow200,
    contrastText: dads.gray900,
  },
  info: { main: dads.key300, dark: dads.key200, contrastText: dads.gray900 },
  grey,
  text: {
    primary: dads.gray50,
    secondary: dads.gray300,
    disabled: dads.gray500,
  },
  divider: dads.gray600,
  background: { default: dads.gray900, paper: dads.gray900 },
  action: {
    active: dads.gray300,
    disabled: dads.gray500,
    disabledBackground: dads.gray700,
  },
  dads: {
    heading: dads.white,
    line: dads.gray400,
    lineStrong: dads.white,
    focusOuter: dads.white,
    focusInner: dads.focusYellow,
    containedActiveBg: dads.key100,
    disabledFill: dads.gray700,
    onDisabledFill: dads.gray400,
    disabledLine: dads.gray600,
    disabledInputBg: dads.gray800,
    outlinedHoverBg: dads.key1000,
    outlinedActiveBg: dads.key900,
    textHoverBg: dads.key1000,
    textActiveBg: dads.key900,
    onTintHover: dads.key200,
    onTintActive: dads.key100,
    link: dads.key300,
    linkHover: dads.key200,
    linkVisited: dads.magenta300,
    linkActive: dads.orange300,
    // 黄色の背景に載るので、ダークでもフォーカス中のリンク文字は暗い色にする。
    linkOnFocus: dads.black,
  },
};

export const theme = createTheme({
  // OS のライト/ダーク設定に追従させる。手動の切り替え UI は作らない。
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  cssVariables: { colorSchemeSelector: "media" },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    ...elevation,
    ...Array<string>(16).fill(elevation[8]),
  ] as unknown as ReturnType<typeof createTheme>["shadows"],
  typography: {
    fontFamily:
      'var(--font-noto-sans-jp), "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif',
    // DADS のウェイトは 400 と 700 の 2 つだけ。見出しは本文より一段濃い色。
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 700,
    fontWeightBold: 700,
    h1: { ...textStyle(36, 700, 1.4, "0.01em"), color: v("dads-heading") }, // Std-36B-140
    h2: { ...textStyle(32, 700, 1.5, "0.01em"), color: v("dads-heading") }, // Std-32B-150
    h3: { ...textStyle(28, 700, 1.5, "0.01em"), color: v("dads-heading") }, // Std-28B-150
    h4: { ...textStyle(24, 700, 1.5, "0.02em"), color: v("dads-heading") }, // Std-24B-150
    h5: { ...textStyle(22, 700, 1.5, "0.02em"), color: v("dads-heading") }, // Std-22B-150
    h6: { ...textStyle(20, 700, 1.5, "0.02em"), color: v("dads-heading") }, // Std-20B-150
    subtitle1: {
      ...textStyle(17, 700, 1.7, "0.02em"),
      color: v("dads-heading"),
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
                borderRadius: 4,
                fontSize: "0.875rem",
              },
            },
            {
              props: { size: "medium" },
              style: {
                minWidth: 80,
                minHeight: 36,
                padding: "2px 12px",
                borderRadius: 6,
              },
            },
            {
              props: { size: "large" },
              style: {
                minWidth: 96,
                minHeight: 48,
                padding: "8px 16px",
                borderRadius: 8,
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
                  backgroundColor: v("dads-disabledFill"),
                  color: v("dads-onDisabledFill"),
                },
              },
            },
            {
              props: { variant: "contained", color: "primary" },
              style: {
                "&:active": { backgroundColor: v("dads-containedActiveBg") },
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
                  borderColor: v("dads-disabledLine"),
                  color: v("dads-disabledLine"),
                },
              },
            },
            {
              props: { variant: "outlined", color: "primary" },
              style: {
                "&:hover": {
                  backgroundColor: v("dads-outlinedHoverBg"),
                  color: v("dads-onTintHover"),
                },
                "&:active": {
                  backgroundColor: v("dads-outlinedActiveBg"),
                  color: v("dads-onTintActive"),
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
                  backgroundColor: v("dads-textHoverBg"),
                  color: v("dads-onTintHover"),
                },
                "&:active": {
                  backgroundColor: v("dads-textActiveBg"),
                  color: v("dads-onTintActive"),
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
          color: v("dads-link"),
          textDecorationColor: "currentColor",
          textDecorationThickness: "1px",
          textUnderlineOffset: "3px",
          "&:visited": { color: v("dads-linkVisited") },
          "&:hover": {
            color: v("dads-linkHover"),
            textDecorationThickness: "3px",
          },
          "&:active": {
            color: v("dads-linkActive"),
            textDecorationThickness: "1px",
          },
          "&:focus-visible": {
            borderRadius: 4,
            backgroundColor: v("dads-focusInner"),
            color: v("dads-linkOnFocus"),
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorDefault: {
          backgroundColor: v("background-default"),
          color: v("dads-heading"),
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
          borderRadius: 8,
          letterSpacing: "0.02em",
          variants: [
            { props: { size: "small" }, style: { fontSize: "0.875rem" } },
            { props: { size: "medium" }, style: { fontSize: "1rem" } },
            // 既定の枠（grey[400]）は白地で 3:1 に届かないので、DADS のコンポーネント境界線の色に。
            {
              props: { variant: "outlined", color: "default" },
              style: { borderColor: v("dads-line") },
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
            borderRadius: 12,
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
        paper: {
          border: `1px solid ${v("dads-lineStrong")}`,
          boxShadow: elevation[3],
        },
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
    // ポップアップ類は DADS の割り当てどおりエレベーション 1。
    MuiPopover: {
      styleOverrides: { paper: { boxShadow: elevation[1] } },
    },
    MuiAutocomplete: {
      styleOverrides: { paper: { boxShadow: elevation[1] } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: v("dads-line"),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: v("dads-lineStrong"),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: v("primary-main"),
            borderWidth: 2,
          },
          "&.Mui-disabled": { backgroundColor: v("dads-disabledInputBg") },
          "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
            borderColor: v("dads-disabledLine"),
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
          color: v("dads-heading"),
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          ...textStyle(16, 400, 1.2),
          color: v("text-primary"),
          "&.Mui-selected": { color: v("dads-heading"), fontWeight: 700 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 4, backgroundColor: v("primary-main") },
      },
    },
  },
});
