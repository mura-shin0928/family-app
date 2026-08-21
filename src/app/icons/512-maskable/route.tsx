import { ImageResponse } from "next/og";
import { AppIconGlyph } from "@/lib/app-icon";

const SIZE = 512;
// maskable icon の安全領域（中央の円/角丸でクロップされても図柄が欠けないよう余白を取る）。
const SAFE_PADDING = Math.round(SIZE * 0.2);

// 中身は完全に静的（引数もリクエスト依存もない）なので、Next 15以降の既定である
// 毎リクエストのImageResponse生成を避け、ビルド時に1回だけレンダーさせる。
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    <AppIconGlyph size={SIZE} padding={SAFE_PADDING} rounded={false} />,
    { width: SIZE, height: SIZE },
  );
}
