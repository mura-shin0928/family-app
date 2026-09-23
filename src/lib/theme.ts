import { createTheme } from "@mui/material/styles";
import { dads } from "./dads";

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

// DADS のフォーカスリング（黒 4px の外枠 + 黄 2px の内枠）。全要素共通で変更しない。
const focusRing = {
  outline: `4px solid ${dads.black}`,
  outlineOffset: "2px",
  boxShadow: `0 0 0 2px ${dads.focusYellow}`,
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

export const theme = createTheme({
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
    // DADS のウェイトは 400 と 700 の 2 つだけ。見出しの色は gray-900。
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 700,
    fontWeightBold: 700,
    h1: { ...textStyle(36, 700, 1.4, "0.01em"), color: dads.gray900 }, // Std-36B-140
    h2: { ...textStyle(32, 700, 1.5, "0.01em"), color: dads.gray900 }, // Std-32B-150
    h3: { ...textStyle(28, 700, 1.5, "0.01em"), color: dads.gray900 }, // Std-28B-150
    h4: { ...textStyle(24, 700, 1.5, "0.02em"), color: dads.gray900 }, // Std-24B-150
    h5: { ...textStyle(22, 700, 1.5, "0.02em"), color: dads.gray900 }, // Std-22B-150
    h6: { ...textStyle(20, 700, 1.5, "0.02em"), color: dads.gray900 }, // Std-20B-150
    subtitle1: { ...textStyle(17, 700, 1.7, "0.02em"), color: dads.gray900 }, // Std-17B-170
    subtitle2: textStyle(14, 700, 1.3), // Dns-14B-130
    body1: textStyle(16, 400, 1.7, "0.02em"), // Std-16N-170
    // 一覧の行など詰めたい本文。DADS は本文を 16px 未満にしないので Dns-16N-130。
    body2: textStyle(16, 400, 1.3), // Dns-16N-130
    caption: textStyle(14, 400, 1.3), // Dns-14N-130
    overline: textStyle(14, 700, 1.3),
    button: { ...textStyle(16, 700, 1, "0.02em"), textTransform: "none" }, // Oln-16B-100
  },
  palette: {
    mode: "light",
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
    grey: {
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
    },
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
                  backgroundColor: dads.gray300,
                  color: dads.gray50,
                },
              },
            },
            {
              props: { variant: "contained", color: "primary" },
              style: { "&:active": { backgroundColor: dads.key1200 } },
            },
            {
              props: { variant: "outlined" },
              style: {
                borderColor: "currentColor",
                backgroundColor: dads.white,
                "&:hover": {
                  borderColor: "currentColor",
                  textDecoration: "underline",
                  textDecorationThickness: "1px",
                },
                "&.Mui-disabled": {
                  borderColor: dads.gray300,
                  color: dads.gray300,
                },
              },
            },
            {
              props: { variant: "outlined", color: "primary" },
              style: {
                "&:hover": {
                  backgroundColor: dads.key200,
                  color: dads.key1000,
                },
                "&:active": {
                  backgroundColor: dads.key300,
                  color: dads.key1200,
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
                "&:hover": { backgroundColor: dads.key50, color: dads.key1000 },
                "&:active": {
                  backgroundColor: dads.key100,
                  color: dads.key1200,
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
          color: dads.key1000,
          textDecorationColor: "currentColor",
          textDecorationThickness: "1px",
          textUnderlineOffset: "3px",
          "&:visited": { color: dads.linkVisited },
          "&:hover": { color: dads.key900, textDecorationThickness: "3px" },
          "&:active": {
            color: dads.linkActive,
            textDecorationThickness: "1px",
          },
          "&:focus-visible": {
            borderRadius: 4,
            backgroundColor: dads.focusYellow,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorDefault: {
          backgroundColor: dads.white,
          color: dads.gray900,
          borderBottom: `1px solid ${dads.gray420}`,
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
              style: { borderColor: dads.gray600 },
            },
          ],
        },
      },
    },
    // DADS のノティフィケーションバナー：白地に 3px の枠。色はアイコンと枠だけに使う。
    MuiAlert: {
      styleOverrides: {
        message: textStyle(16, 400, 1.5),
        root: ({ ownerState, theme }) => {
          if (ownerState.variant !== "standard") return {};
          const color = ownerState.color ?? ownerState.severity ?? "success";
          return {
            borderRadius: 12,
            border: `3px solid ${theme.palette[color].main}`,
            backgroundColor: dads.white,
            color: dads.gray800,
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
          border: `1px solid ${dads.black}`,
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
          "& .MuiOutlinedInput-notchedOutline": { borderColor: dads.gray600 },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: dads.black,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: dads.key900,
            borderWidth: 2,
          },
          "&.Mui-disabled": { backgroundColor: dads.gray50 },
          "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
            borderColor: dads.gray300,
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
          color: dads.gray900,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          ...textStyle(16, 400, 1.2),
          color: dads.gray800,
          "&.Mui-selected": { color: dads.gray900, fontWeight: 700 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 4, backgroundColor: dads.key900 },
      },
    },
  },
});
