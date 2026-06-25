import pluginVue from "eslint-plugin-vue";
import vueTsEslintConfig from "@vue/eslint-config-typescript";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import pluginJsonc from "eslint-plugin-jsonc";

export default [
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "savejson.js",
      "**/*.cjs",
      ".eslintrc.cjs",
      "scripts/**",
      "research/**",
      ".claude/**",
    ],
  },
  ...pluginVue.configs["flat/essential"],
  ...vueTsEslintConfig(),
  skipFormatting,

  // JSON 文件检查：检测重复 key 等问题
  ...pluginJsonc.configs["flat/recommended-with-json"],
  {
    name: "app/json-strict",
    files: ["**/*.json"],
    rules: {
      "jsonc/no-dupe-keys": "error",
    },
  },
];
