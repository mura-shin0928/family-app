import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  ssr: {
    // "server-only" は既定でimport時に例外を投げる（Next.jsのビルド時にのみ
    // react-server条件でno-opに差し替わる想定のパッケージ）。vitestはSSRモードで
    // モジュールを解決するため、ここで同じ条件を与えてno-op化する。
    resolve: {
      conditions: ["react-server"],
    },
  },
});
