#!/usr/bin/env node
/**
 * UI 文案 i18n key 同步校验
 *
 * 递归对比 src/i18n/zh-CN/index.json 与 src/i18n/en/index.json 的 key 路径树（忽略叶子值），
 * 任一文件缺失/多余 key 即报错。防止英文 UI 文案缺失导致 fallback 到中文产生混合语言 UI。
 *
 * 接入 validate:data 链。
 */
import { readFileSync } from "node:fs";

const zhPath = "src/i18n/zh-CN/index.json";
const enPath = "src/i18n/en/index.json";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

/**
 * 递归收集对象的所有 key 路径（叶子节点的完整路径）。
 * 数组视为叶子（数组元素的索引不视为 key 路径，因为 i18n 文案数组按顺序对应）。
 * @param {any} obj
 * @param {string} prefix
 * @param {Set<string>} out
 */
function collectKeyPaths(obj, prefix, out) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return;
  }
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      collectKeyPaths(value, path, out);
    } else {
      out.add(path);
    }
  }
}

const zh = readJson(zhPath);
const en = readJson(enPath);

const zhKeys = new Set();
const enKeys = new Set();
collectKeyPaths(zh, "", zhKeys);
collectKeyPaths(en, "", enKeys);

const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));
const extraInEn = [...enKeys].filter((k) => !zhKeys.has(k));

if (missingInEn.length === 0 && extraInEn.length === 0) {
  console.log(`✅ UI 文案 key 同步: zh-CN/en index.json 一致 (${zhKeys.size} 个 key)`);
  process.exit(0);
}

console.log("❌ UI 文案 key 不同步: zh-CN/index.json 与 en/index.json");
if (missingInEn.length > 0) {
  console.log(`   EN 缺少 (${missingInEn.length}):`);
  for (const k of missingInEn.slice(0, 60)) console.log(`     - ${k}`);
  if (missingInEn.length > 60) console.log(`     ...另有 ${missingInEn.length - 60} 个`);
}
if (extraInEn.length > 0) {
  console.log(`   EN 多余 (${extraInEn.length}):`);
  for (const k of extraInEn.slice(0, 60)) console.log(`     - ${k}`);
  if (extraInEn.length > 60) console.log(`     ...另有 ${extraInEn.length - 60} 个`);
}
process.exit(1);
