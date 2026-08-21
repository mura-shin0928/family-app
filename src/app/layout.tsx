import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeRegistry } from "./ThemeRegistry";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={geistSans.variable}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
