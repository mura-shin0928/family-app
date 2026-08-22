import { createTheme } from "@mui/material/styles";

/**
 * OSのダーク/ライト設定に自動追従させる（`colorSchemeSelector: "media"`）。
 * JSでの手動切り替えUIは作らない方針のため、`prefers-color-scheme` 以外の切り替え手段は持たせない。
 */
export const theme = createTheme({
  colorSchemes: { light: true, dark: true },
  cssVariables: { colorSchemeSelector: "media" },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "var(--font-geist-sans), sans-serif",
  },
  palette: {
    primary: {
      main: "#4f46e5",
    },
    success: {
      main: "#10b981",
    },
    warning: {
      main: "#f59e0b",
    },
  },
  components: {
    MuiChip: {
      defaultProps: {
        size: "small",
      },
    },
    // iOS Safariはフォーム要素のフォントサイズが16px未満だとフォーカス時に
    // 自動ズームする。size="small"等でも入力中の文字は16px以上を保つため、
    // 個々のTextField側ではなくここで下限を固定する（表示用テキストの
    // 14px運用には影響しない）。
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: "1rem",
        },
      },
    },
  },
});
