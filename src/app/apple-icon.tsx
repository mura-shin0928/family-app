import { ImageResponse } from "next/og";
import { AppIconGlyph } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // iOS が自前で角丸マスクを掛けるため、背景は角丸にしない。
  return new ImageResponse(<AppIconGlyph size={size.width} rounded={false} />, {
    ...size,
  });
}
