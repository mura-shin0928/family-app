import { appIconColors as c } from "@/lib/brand";

// 図柄は viewBox（90）の幅いっぱい近くまであるので、アイコンの縁から離れるよう小さめに描く。
const MARK_SCALE = 0.8;

/**
 * アプリアイコン共通の図柄（角丸四角 + ひとつ屋根の下に大・中・小の家族）。
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
  const markSize = Math.round(glyphSize * MARK_SCALE);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: c.background,
        borderRadius: rounded ? Math.round(size * 0.22) : 0,
      }}
    >
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 90 90"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M11 40 45 14 79 40"
          stroke={c.roof}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="14" y="46" width="22" height="34" rx="11" fill={c.large} />
        <rect x="39" y="52" width="19" height="28" rx="9.5" fill={c.medium} />
        <rect x="61" y="59" width="15" height="21" rx="7.5" fill={c.small} />
      </svg>
    </div>
  );
}
