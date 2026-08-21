import { ImageResponse } from "next/og";
import { AppIconGlyph } from "@/lib/app-icon";

const SIZE = 512;

// 中身は完全に静的（引数もリクエスト依存もない）なので、Next 15以降の既定である
// 毎リクエストのImageResponse生成を避け、ビルド時に1回だけレンダーさせる。
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<AppIconGlyph size={SIZE} />, {
    width: SIZE,
    height: SIZE,
  });
}
