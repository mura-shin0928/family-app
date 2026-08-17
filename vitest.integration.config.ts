import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `supabase start` でローカルDBが起動している状態で実行する。
// CI では動かさないため vitest.config.ts (npm test) には含めない。
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
