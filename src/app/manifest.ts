import type { MetadataRoute } from "next";
import { dads } from "@/lib/dads";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family App",
    short_name: "やることリスト",
    description: "家族のこれからやることを共有するアプリ",
    start_url: "/tasks",
    display: "standalone",
    background_color: dads.white,
    theme_color: dads.white,
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
