import { Mascot } from "@/components/Mascot";
import { brand } from "@/lib/brand";

const BACKGROUND = brand.light.tagBg;
// Mascot の viewBox（90）は図柄の周囲に余白があるので、そのぶん大きめに描いてちょうどよくする。
const MASCOT_SCALE = 1.1;

/**
 * アプリアイコン共通の図柄（角丸四角 + マスコット「おうちくん」）。
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
      <Mascot size={Math.round(glyphSize * MASCOT_SCALE)} />
    </div>
  );
}
