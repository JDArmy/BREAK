import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "vue-i18n": "vue-i18n/dist/vue-i18n.mjs",
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "src/views/relation/relationAttackPath.ts",
        "src/views/relation/relationGraphInsightShared.ts",
        "src/views/relation/relationGraphInsights.ts",
        "src/views/relation/relationGraphRelationSummary.ts",
        "src/views/relation/relationGraphRootAnalysis.ts",
        "src/views/relation/relationNetworkLayout.ts",
        "src/composables/useSearch.ts",
        "src/composables/useSafeI18n.ts",
        "src/BREAK/**/*.ts",
      ],
      exclude: ["src/**/__tests__/**"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 65,
        statements: 85,
      },
    },
  },
});
