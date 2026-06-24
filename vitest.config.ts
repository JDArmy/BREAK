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
        "src/composables/**/*.ts",
        "src/views/relation/**/*.ts",
        "src/components/KnowledgeSplitView.vue",
        "src/components/relation/RelationNodeDetailDrawer.vue",
        "src/components/relation/RelationSelectorBar.vue",
        "src/components/RiskDetail.vue",
        "src/components/AvoidanceDetail.vue",
        "src/BREAK/**/*.ts",
      ],
      exclude: ["src/**/__tests__/**", "src/**/*.d.ts"],
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 55,
        statements: 55,
      },
    },
  },
});
