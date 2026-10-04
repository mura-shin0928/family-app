import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family App",
    short_name: "やることリスト",
    description: "家族のこれからやることを共有するアプリ",
    start_url: "/tasks",
    display: "standalone",
    background_color: brand.light.background,
    theme_color: brand.light.background,
    // 他アプリの共有シートに出す（Android のインストール済みPWAのみ）。
    share_target: {
      action: "/tasks/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
