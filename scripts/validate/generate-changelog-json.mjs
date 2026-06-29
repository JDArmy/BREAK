#!/usr/bin/env node
/**
 * 将 CHANGELOG.md 解析为结构化 JSON 数组，输出到 public/data/changelog.json
 * 供前端 ChangelogView 异步加载使用。
 *
 * 用法：node scripts/validate/generate-changelog-json.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CHANGELOG_PATH = resolve(ROOT, "CHANGELOG.md");
const OUTPUT_DIR = resolve(ROOT, "public/data");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "changelog.json");

const raw = readFileSync(CHANGELOG_PATH, "utf-8");

// 按 ## 版本标题分割
const entries = [];
const versionRegex = /^## (.+)$/gm;
let match;
const splits = [];

while ((match = versionRegex.exec(raw)) !== null) {
  splits.push({ version: match[1].trim(), index: match.index, headerEnd: match.index + match[0].length });
}

for (let i = 0; i < splits.length; i++) {
  const { version, headerEnd } = splits[i];
  const bodyEnd = i + 1 < splits.length ? splits[i + 1].index : raw.length;
  const body = raw.slice(headerEnd, bodyEnd).trim();

  // summary：版本标题下的第一行非空文本
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const summary = lines[0] || "";

  entries.push({ version, summary, body });
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2) + "\n", "utf-8");

console.log(`✅ changelog.json 已生成：${entries.length} 个版本条目 → ${OUTPUT_PATH}`);
