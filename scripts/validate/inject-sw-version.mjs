#!/usr/bin/env node
/**
 * 将 dist/sw.js 中的 __SW_VERSION__ 占位符替换为 package.json 中的版本号。
 * 在 vite build (build-only) 之后执行。
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SW_PATH = resolve(ROOT, "dist/sw.js");
const PKG_PATH = resolve(ROOT, "package.json");

const version = JSON.parse(readFileSync(PKG_PATH, "utf-8")).version;
const sw = readFileSync(SW_PATH, "utf-8");
const updated = sw.replace(/__SW_VERSION__/g, version);

if (sw === updated) {
  console.warn("⚠️  sw.js 中未找到 __SW_VERSION__ 占位符");
  process.exit(1);
}

writeFileSync(SW_PATH, updated, "utf-8");
console.log(`✅ sw.js 版本注入完成：break-${version}`);
