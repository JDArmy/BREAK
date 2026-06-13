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
  { name: "BREAK-Risks", test: toChunkTest("/src/BREAK/risks"), maxSize: 300 * 1024 },
  { name: "BREAK-Avoidances", test: toChunkTest("/src/BREAK/avoidances"), maxSize: 300 * 1024 },
  { name: "BREAK-AttackTools", test: toChunkTest("/src/BREAK/attack-tools"), maxSize: 300 * 1024 },
  { name: "BREAK-ThreatActors", test: toChunkTest("/src/BREAK/threat-actors"), maxSize: 300 * 1024 },
  { name: "BREAK", test: toChunkTest("/src/BREAK") },
  {
    name: "i18n-en-Risks",
    test: toChunkTest("/src/i18n/en/BREAK/risks"),
    maxSize: 300 * 1024,
  },
  {
    name: "i18n-en-Avoidances",
    test: toChunkTest("/src/i18n/en/BREAK/avoidances"),
    maxSize: 300 * 1024,
  },
  {
    name: "i18n-en-AttackTools",
    test: toChunkTest("/src/i18n/en/BREAK/attack-tools"),
    maxSize: 300 * 1024,
  },
  {
    name: "i18n-en-ThreatActors",
    test: toChunkTest("/src/i18n/en/BREAK/threat-actors"),
    maxSize: 300 * 1024,
  },
  { name: "i18n-en-BREAK", test: toChunkTest("/src/i18n/en/BREAK") },
  { name: "i18n", test: toChunkTest("/src/i18n") },
  { name: "fuse.js", test: toChunkTest("node_modules/fuse.js") },
  {
    name: "echarts",
    test: (id: string) => id.includes("node_modules/echarts") || id.includes("node_modules/zrender"),
  },
  { name: "vue-router", test: toChunkTest("node_modules/vue-router") },
  { name: "vue-i18n", test: toChunkTest("node_modules/vue-i18n") },
  { name: "vue", test: toChunkTest("node_modules/vue") },
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
  build: {
    minify: "terser",
    outDir: "docs",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: codeSplittingGroups,
        },
      },
    },
  },
});
