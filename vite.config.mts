import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

import { visualizer } from "rollup-plugin-visualizer";

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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/BREAK/utils")) return "BREAK-utils";
          if (id.includes("/src/BREAK/risks")) return "BREAK-Risks";
          if (id.includes("/src/BREAK/avoidances")) return "BREAK-Avoidances";
          if (id.includes("/src/BREAK/attack-tools")) return "BREAK-AttackTools";
          if (id.includes("/src/BREAK/threat-actors")) return "BREAK-ThreatActors";
          if (id.includes("/src/BREAK")) return "BREAK";
          if (id.includes("node_modules/vue-router")) return "vue-router";
          if (id.includes("node_modules/vue-i18n")) return "vue-i18n";
          if (id.includes("node_modules/vue")) return "vue";
          if (id.includes("node_modules/element-plus")) return "element-plus";
          if (id.includes("node_modules/relation-graph"))
            return "relation-graph";
        },
      },
    },
  },
});
