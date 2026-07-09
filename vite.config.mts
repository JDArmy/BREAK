import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

import { visualizer } from "rollup-plugin-visualizer";

const toChunkTest = (matcher: string) => (id: string) => id.includes(matcher);

const codeSplittingGroups = [
  { name: "validation", test: toChunkTest("/src/validation") },
  { name: "zod", test: toChunkTest("node_modules/zod") },
  { name: "BREAK-utils", test: toChunkTest("/src/BREAK/utils") },
  // entityRegistry 是入口（router/MenuList）必需的轻量元数据（零业务数据依赖），
  // 单独成 chunk 避免与全量 barrel（@/BREAK/index.ts）同 chunk 导致入口连带拉全部实体数据。
  // priority 高于 BREAK 组与 vue 组，确保 entityRegistry 优先归入此组。见 vite-chunk-barrel-contamination 记忆。
  { name: "BREAK-registry", test: (id: string) => id.includes("/src/BREAK/entityRegistry"), priority: 20 },
  { name: "BREAK-Risks", test: toChunkTest("/src/BREAK/risks"), maxSize: 300 * 1024 },
  { name: "BREAK-Avoidances", test: toChunkTest("/src/BREAK/avoidances"), maxSize: 300 * 1024 },
  { name: "BREAK-AttackTools", test: toChunkTest("/src/BREAK/attack-tools"), maxSize: 300 * 1024 },
  { name: "BREAK-ThreatActors", test: toChunkTest("/src/BREAK/threat-actors"), maxSize: 300 * 1024 },
  { name: "BREAK-Terms", test: toChunkTest("/src/BREAK/terms"), maxSize: 300 * 1024 },
  { name: "BREAK-Cases", test: toChunkTest("/src/BREAK/cases"), maxSize: 300 * 1024 },
  { name: "BREAK-BusinessDomains", test: toChunkTest("/src/BREAK/business-domains") },
  { name: "BREAK", test: toChunkTest("/src/BREAK") },
  // 构建时预合并的完整英文数据（src/i18n/en/.generated/）
  { name: "en-full-Risks", test: toChunkTest("/src/i18n/en/.generated/risks"), maxSize: 300 * 1024 },
  { name: "en-full-Avoidances", test: toChunkTest("/src/i18n/en/.generated/avoidances"), maxSize: 300 * 1024 },
  { name: "en-full-AttackTools", test: toChunkTest("/src/i18n/en/.generated/attack-tools"), maxSize: 300 * 1024 },
  { name: "en-full-ThreatActors", test: toChunkTest("/src/i18n/en/.generated/threat-actors"), maxSize: 300 * 1024 },
  { name: "en-full-Terms", test: toChunkTest("/src/i18n/en/.generated/terms"), maxSize: 300 * 1024 },
  { name: "en-full-Cases", test: toChunkTest("/src/i18n/en/.generated/cases"), maxSize: 300 * 1024 },
  { name: "en-full-BusinessDomains", test: toChunkTest("/src/i18n/en/.generated/business-domains") },
  { name: "en-full-BREAK", test: toChunkTest("/src/i18n/en/.generated") },
  // 英文翻译源文件（改造后运行时不再直接 import，保留用于其他引用）
  { name: "i18n-en-Risks", test: toChunkTest("/src/i18n/en/BREAK/risks") },
  { name: "i18n-en-Avoidances", test: toChunkTest("/src/i18n/en/BREAK/avoidances") },
  { name: "i18n-en-AttackTools", test: toChunkTest("/src/i18n/en/BREAK/attack-tools") },
  { name: "i18n-en-ThreatActors", test: toChunkTest("/src/i18n/en/BREAK/threat-actors") },
  { name: "i18n-en-Terms", test: toChunkTest("/src/i18n/en/BREAK/terms"), maxSize: 300 * 1024 },
  { name: "i18n-en-Cases", test: toChunkTest("/src/i18n/en/BREAK/cases"), maxSize: 300 * 1024 },
  { name: "i18n-en-BusinessDomains", test: toChunkTest("/src/i18n/en/BREAK/business-domains") },
  { name: "i18n-en-BREAK", test: toChunkTest("/src/i18n/en/BREAK") },
  { name: "i18n", test: toChunkTest("/src/i18n") },
  { name: "fuse.js", test: toChunkTest("node_modules/fuse.js") },
  { name: "zrender", test: toChunkTest("node_modules/zrender") },
  { name: "echarts", test: toChunkTest("node_modules/echarts") },
  { name: "vue-router", test: toChunkTest("node_modules/vue-router") },
  { name: "vue-i18n", test: toChunkTest("node_modules/vue-i18n") },
  { name: "vue", test: (id: string) => /[\\/]node_modules[\\/]vue[\\/]/.test(id), priority: 10 },
  { name: "element-plus", test: toChunkTest("node_modules/element-plus") },
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    ...(process.env.ANALYZE ? [visualizer({ open: true })] : []),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "vue-i18n": "vue-i18n/dist/vue-i18n.mjs",
    },
  },
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    minify: "terser",
    outDir: "dist",
    rolldownOptions: {
      logLevel: "silent",
      output: {
        codeSplitting: {
          groups: codeSplittingGroups,
        },
      },
    },
  },
});
