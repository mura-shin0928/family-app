import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { dads } from "@/lib/dads";
import { ThemeRegistry } from "./ThemeRegistry";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family App",
  description: "家族のこれからやることを共有するアプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "やることリスト",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: dads.white },
    { media: "(prefers-color-scheme: dark)", color: dads.gray900 },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
