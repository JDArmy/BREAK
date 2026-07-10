/**
 * 将历史 Avoidance.category 的 AC 编号迁移为语义 key。
 * 同时更新 Avoidance 中直接提及旧分类编号的中英文文本。
 *
 * 用法：node scripts/migrate/avoidance-category-keys.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';

const categoryMap = {
  AC01: 'prevention',
  AC02: 'perception',
  AC03: 'detection',
  AC04: 'disposition',
};

const directories = [
  'src/BREAK/avoidances',
  'src/i18n/en/BREAK/avoidances',
];

function replaceLegacyCategoryText(value) {
  if (typeof value === 'string') {
    return value.replace(/\b(AC0[1-4])\b/g, (_, legacyKey) => categoryMap[legacyKey]);
  }
  if (Array.isArray(value)) return value.map(replaceLegacyCategoryText);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, replaceLegacyCategoryText(nested)]),
  );
}

let migratedCategories = 0;
let updatedFiles = 0;

for (const relativeDir of directories) {
  const directory = path.join(projectRoot, relativeDir);
  for (const file of fs.readdirSync(directory).filter((item) => item.endsWith('.json')).sort()) {
    const filePath = path.join(directory, file);
    const data = readJson(filePath);
    const migrated = replaceLegacyCategoryText(data);

    if (relativeDir === 'src/BREAK/avoidances') {
      for (const entity of Object.values(data)) {
        if (categoryMap[entity.category]) migratedCategories += 1;
      }
    }

    if (JSON.stringify(data) !== JSON.stringify(migrated)) {
      writeJson(filePath, migrated);
      updatedFiles += 1;
    }
  }
}

console.log(`✅ 已迁移 ${migratedCategories} 条 Avoidance.category，更新 ${updatedFiles} 个文件`);
