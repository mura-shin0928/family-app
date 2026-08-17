import { ImageResponse } from "next/og";
import { AppIconGlyph } from "@/lib/app-icon";

const SIZE = 192;

export function GET() {
  return new ImageResponse(<AppIconGlyph size={SIZE} />, {
    width: SIZE,
    height: SIZE,
  });
}
