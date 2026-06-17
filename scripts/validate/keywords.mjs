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

const idOnlyKeywordPattern = /^[A-Z]{1,2}\d{4}(?:-\d{3})?$/;

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
  const suggestions = [];

  for (const [key, entity] of Object.entries(data)) {
    const currentKeywords = Array.isArray(entity.keywords) ? entity.keywords : [];
    const sanitizedKeywords = sanitizeKeywords(currentKeywords);
    const nextEntity =
      locale === "en" && !Array.isArray(entity.keywords)
        ? { ...entity }
        : { ...entity, keywords: sanitizedKeywords };

    next[key] = nextEntity;

    if (JSON.stringify(currentKeywords) !== JSON.stringify(sanitizedKeywords)) {
      suggestions.push({
        filePath,
        key,
        current: currentKeywords,
        suggested: sanitizedKeywords,
      });
    }
  }

  if (writeMode && suggestions.length > 0) {
    writeJson(filePath, next);
  }

  return { raw: data, suggestions };
}

function main() {
  const issues = [];
  const suggestions = [];

  for (const { locale, root } of localeRoots) {
    for (const dir of categoryDirs) {
      const fullDir = path.join(projectRoot, root, dir);
      const files = fs
        .readdirSync(fullDir)
        .filter((item) => item.endsWith(".json"))
        .sort();

      for (const file of files) {
        const filePath = path.join(fullDir, file);
        const { raw, suggestions: fileSuggestions } = processFile(filePath, locale);
        suggestions.push(...fileSuggestions);

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

          for (const keyword of nonEmptyKeywords) {
            if (idOnlyKeywordPattern.test(keyword)) {
              issues.push(`${filePath}.${key}: keywords 不应使用纯实体 ID "${keyword}"`);
            }
          }
        }
      }
    }
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

  if (writeMode) {
    console.log(`✅ 已规范化 ${suggestions.length} 个实体的 keywords`);
  } else if (suggestions.length > 0) {
    console.log(`\nℹ️ keywords 可规范化建议，共 ${suggestions.length} 个实体；脚本只报告，不写入实体数据。`);
    for (const suggestion of suggestions.slice(0, 40)) {
      console.log(`- ${suggestion.filePath}.${suggestion.key}`);
      console.log(`  current: ${JSON.stringify(suggestion.current)}`);
      console.log(`  suggested: ${JSON.stringify(suggestion.suggested)}`);
    }
    if (suggestions.length > 40) {
      console.log(`... 另有 ${suggestions.length - 40} 个建议未显示`);
    }
  }

  console.log("✅ keywords 审计通过");
}

main();
