import { dads } from "@/lib/dads";

const BACKGROUND = dads.key900;
const FOREGROUND = dads.white;

/**
 * アプリアイコン共通の図柄（角丸四角 + チェックマーク）。
 * next/og の ImageResponse から呼び出す前提（favicon / apple-icon / manifest用アイコン）。
 * maskable用は padding を大きめに取り、背景を全面まで塗って安全領域を確保する。
 */
export function AppIconGlyph({
  size,
  padding = 0,
  rounded = true,
}: {
  size: number;
  padding?: number;
  rounded?: boolean;
}) {
  const glyphSize = size - padding * 2;
  const strokeWidth = Math.max(Math.round(glyphSize * 0.1), 3);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKGROUND,
        borderRadius: rounded ? Math.round(size * 0.22) : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          width: Math.round(glyphSize * 0.5),
          height: Math.round(glyphSize * 0.3),
          borderLeft: `${strokeWidth}px solid ${FOREGROUND}`,
          borderBottom: `${strokeWidth}px solid ${FOREGROUND}`,
          transform: "rotate(-45deg)",
        }}
      />
    </div>
  );
}
