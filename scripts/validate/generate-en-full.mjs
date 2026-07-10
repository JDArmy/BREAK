/**
 * 构建前预合并中英文 BREAK 数据，生成独立的完整英文 JSON 文件。
 *
 * 使英文 locale 运行时不再依赖中文 BREAK 数据：
 *   中文结构源（src/BREAK/*） + 英文翻译（src/i18n/en/BREAK/*）
 *   → mergeWithStructure 逐文件合并
 *   → 写入 src/i18n/en/.generated/{entity}/{ID}.json（保持与源文件一一对应）
 *
 * 逐文件输出使 Vite/rolldown 的 maxSize 分片自然生效，
 * 避免单个大 JSON 产生超大 chunk。
 *
 * 用法：
 *   node scripts/validate/generate-en-full.mjs
 *   npm run generate:en-full
 */

import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';
import { mergeWithStructure } from '../../src/utils/mergeWithStructure.mjs';

const outputDir = path.join(projectRoot, 'src/i18n/en/.generated');

/** 实体配置：key → 中英文目录 + 输出子目录 */
const entityConfigs = [
  { key: 'risks', cnDir: 'src/BREAK/risks', enDir: 'src/i18n/en/BREAK/risks', outDir: 'risks' },
  { key: 'avoidances', cnDir: 'src/BREAK/avoidances', enDir: 'src/i18n/en/BREAK/avoidances', outDir: 'avoidances' },
  { key: 'attackTools', cnDir: 'src/BREAK/attack-tools', enDir: 'src/i18n/en/BREAK/attack-tools', outDir: 'attack-tools' },
  { key: 'threatActors', cnDir: 'src/BREAK/threat-actors', enDir: 'src/i18n/en/BREAK/threat-actors', outDir: 'threat-actors' },
  { key: 'terms', cnDir: 'src/BREAK/terms', enDir: 'src/i18n/en/BREAK/terms', outDir: 'terms' },
  { key: 'termCategories', cnDir: 'src/BREAK/term-categories', enDir: 'src/i18n/en/BREAK/term-categories', outDir: 'term-categories' },
  { key: 'businessDomains', cnDir: 'src/BREAK/business-domains', enDir: 'src/i18n/en/BREAK/business-domains', outDir: 'business-domains' },
  { key: 'avoidanceCategories', cnDir: 'src/BREAK/avoidance-categories', enDir: 'src/i18n/en/BREAK/avoidance-categories', outDir: 'avoidance-categories' },
  { key: 'cases', cnDir: 'src/BREAK/cases', enDir: 'src/i18n/en/BREAK/cases', outDir: 'cases' },
];

/**
 * 加载目录下所有 JSON 文件，返回 { 文件名: 解析后的对象 } 映射。
 */
function loadJsonFiles(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  if (!fs.existsSync(dir)) return {};

  const result = {};
  for (const file of fs
    .readdirSync(dir)
    .filter((item) => item.endsWith('.json'))
    .sort()) {
    result[file] = readJson(path.join(dir, file));
  }
  return result;
}

/**
 * 判断目标文件是否已存在且内容与待写入数据完全一致。
 * 一致时返回 true，跳过写入以避免不必要的磁盘 IO 和文件时间戳变化。
 */
function isContentUnchanged(filePath, data) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const existing = fs.readFileSync(filePath, 'utf-8');
    const newContent = JSON.stringify(data, null, 2) + '\n';
    return existing === newContent;
  } catch {
    return false;
  }
}

/**
 * 逐文件合并中英文数据并写入输出目录。
 * 每个中文源文件对应一个输出文件，英文翻译同名文件覆盖可翻译字段。
 * 若生成内容与已有文件完全一致则跳过写入，避免不必要的磁盘写入和文件时间戳变化。
 */
function mergeAndWriteEntityFiles(config) {
  const cnFiles = loadJsonFiles(config.cnDir);
  const enFiles = loadJsonFiles(config.enDir);
  const entityOutDir = path.join(outputDir, config.outDir);
  ensureDir(entityOutDir);

  let entityCount = 0;
  let skipped = 0;
  for (const [fileName, cnData] of Object.entries(cnFiles)) {
    const enData = enFiles[fileName] || {};
    // 逐顶层 key（实体 ID）合并
    const merged = {};
    for (const [entityId, cnEntity] of Object.entries(cnData)) {
      const enTrans = enData[entityId];
      merged[entityId] = enTrans
        ? mergeWithStructure(cnEntity, enTrans)
        : cnEntity;
      entityCount++;
    }
    const outPath = path.join(entityOutDir, fileName);
    if (isContentUnchanged(outPath, merged)) {
      skipped++;
    } else {
      writeJson(outPath, merged);
    }
  }
  return { entityCount, skipped };
}

function main() {
  // 确保输出目录存在（不再每次清空，通过一致性判断跳过未变更文件）
  ensureDir(outputDir);

  // 1. 处理各实体类型（逐文件输出）
  let totalSkipped = 0;
  for (const config of entityConfigs) {
    const { entityCount, skipped } = mergeAndWriteEntityFiles(config);
    const written = entityCount > 0 ? (Object.keys(loadJsonFiles(config.cnDir)).length - skipped) : 0;
    if (skipped > 0) {
      console.log(`  ✓ ${config.key}: ${entityCount} 条 (${skipped} 文件未变更，跳过)`);
    } else {
      console.log(`  ✓ ${config.key}: ${entityCount} 条`);
    }
    totalSkipped += skipped;
  }

  // 2. 处理 basic-info（单文件）
  const cnBasicInfo = readJson(path.join(projectRoot, 'src/BREAK/basic-info/main.json'));
  const enBasicInfoPath = path.join(projectRoot, 'src/i18n/en/BREAK/basic-info/main.json');
  const enBasicInfo = fs.existsSync(enBasicInfoPath) ? readJson(enBasicInfoPath) : {};
  const mergedBasicInfo = mergeWithStructure(cnBasicInfo, enBasicInfo);
  const basicInfoOutPath = path.join(outputDir, 'basic-info.json');
  if (isContentUnchanged(basicInfoOutPath, mergedBasicInfo)) {
    console.log(`  ✓ basic-info: 未变更，跳过`);
    totalSkipped++;
  } else {
    writeJson(basicInfoOutPath, mergedBasicInfo);
    console.log(`  ✓ basic-info: 已合并`);
  }

  // 3. 清理输出目录中不再需要的残留文件
  cleanStaleFiles();

  if (totalSkipped > 0) {
    console.log(`\n✅ 英文完整数据生成完成 → ${path.relative(projectRoot, outputDir)}/ (${totalSkipped} 文件无变更已跳过)`);
  } else {
    console.log(`\n✅ 英文完整数据生成完成 → ${path.relative(projectRoot, outputDir)}/`);
  }
}

/**
 * 清理输出目录中不再对应源文件的残留文件。
 * 例如中文源删除了某个实体文件后，对应的 .generated 输出也应移除。
 */
function cleanStaleFiles() {
  for (const config of entityConfigs) {
    const entityOutDir = path.join(outputDir, config.outDir);
    if (!fs.existsSync(entityOutDir)) continue;

    const cnFiles = new Set(Object.keys(loadJsonFiles(config.cnDir)));
    for (const file of fs.readdirSync(entityOutDir)) {
      if (file.endsWith('.json') && !cnFiles.has(file)) {
        fs.unlinkSync(path.join(entityOutDir, file));
      }
    }
  }
}

main();
