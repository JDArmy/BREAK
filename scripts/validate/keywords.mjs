import fs from "node:fs";
import path from "node:path";
import { projectRoot, readJson, writeJson } from "../search/common.mjs";

const writeMode = process.argv.includes("--write");

const categoryDirs = [
  "risks",
  "avoidances",
  "attack-tools",
  "threat-actors",
  "terms",
];

const localeRoots = [
  { locale: "zh", root: "src/BREAK" },
  { locale: "en", root: "src/i18n/en/BREAK" },
];

function normalizeKeyword(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeKeywords(rawKeywords) {
  const seen = new Set();
  const keywords = [];

  for (const value of Array.isArray(rawKeywords) ? rawKeywords : []) {
    const normalized = normalizeKeyword(value);
    if (!normalized) continue;

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);
    keywords.push(normalized);
  }

  return keywords;
}

function processFile(filePath, locale) {
  const data = readJson(filePath);
  const next = {};
  let changed = false;

  for (const [key, entity] of Object.entries(data)) {
    const currentKeywords = Array.isArray(entity.keywords) ? entity.keywords : [];
    const sanitizedKeywords = sanitizeKeywords(currentKeywords);
    const nextEntity =
      locale === "en" && !Array.isArray(entity.keywords)
        ? { ...entity }
        : { ...entity, keywords: sanitizedKeywords };

    next[key] = nextEntity;
    if (JSON.stringify(currentKeywords) !== JSON.stringify(sanitizedKeywords)) {
      changed = true;
    }
  }

  if (writeMode && changed) {
    writeJson(filePath, next);
  }

  return { raw: data, data: next, changed };
}

function main() {
  const issues = [];
  const touchedFiles = [];

  for (const { locale, root } of localeRoots) {
    for (const dir of categoryDirs) {
      const fullDir = path.join(projectRoot, root, dir);
      const files = fs
        .readdirSync(fullDir)
        .filter((item) => item.endsWith(".json"))
        .sort();

      for (const file of files) {
        const filePath = path.join(fullDir, file);
        const { raw, changed } = processFile(filePath, locale);

        if (changed) {
          touchedFiles.push(filePath);
        }

        for (const [key, entity] of Object.entries(raw)) {
          if (locale === "en" && !Array.isArray(entity.keywords)) {
            continue;
          }

          const rawKeywords = Array.isArray(entity.keywords) ? entity.keywords : [];
          const normalizedKeywords = rawKeywords.map((item) => normalizeKeyword(item));
          const nonEmptyKeywords = normalizedKeywords.filter(Boolean);
          const dedupedKeywords = sanitizeKeywords(rawKeywords);

          if (!Array.isArray(entity.keywords)) {
            issues.push(`${filePath}.${key}: keywords 必须为数组`);
            continue;
          }

          if (nonEmptyKeywords.length === 0) {
            issues.push(`${filePath}.${key}: 缺少 keywords`);
          }

          if (normalizedKeywords.length !== rawKeywords.length) {
            issues.push(`${filePath}.${key}: keywords 存在空值`);
          }

          if (dedupedKeywords.length !== nonEmptyKeywords.length) {
            issues.push(`${filePath}.${key}: keywords 存在重复`);
          }
        }
      }
    }
  }

  if (writeMode) {
    console.log(`✅ 已规范化 ${touchedFiles.length} 个 JSON 文件中的 keywords`);
  }

  if (issues.length > 0) {
    console.error(`\n❌ keywords 审计失败，共 ${issues.length} 个问题`);
    for (const issue of issues.slice(0, 120)) {
      console.error(`- ${issue}`);
    }
    if (issues.length > 120) {
      console.error(`... 另有 ${issues.length - 120} 个问题未显示`);
    }
    process.exit(1);
  }

  if (!writeMode) {
    console.log("✅ keywords 审计通过");
  }
}

main();
