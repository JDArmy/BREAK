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
  { key: 'businessScenes', cnDir: 'src/BREAK/business-scenes', enDir: 'src/i18n/en/BREAK/business-scenes', outDir: 'business-scenes' },
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
 * 逐文件合并中英文数据并写入输出目录。
 * 每个中文源文件对应一个输出文件，英文翻译同名文件覆盖可翻译字段。
 */
function mergeAndWriteEntityFiles(config) {
  const cnFiles = loadJsonFiles(config.cnDir);
  const enFiles = loadJsonFiles(config.enDir);
  const entityOutDir = path.join(outputDir, config.outDir);
  ensureDir(entityOutDir);

  let entityCount = 0;
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
    writeJson(path.join(entityOutDir, fileName), merged);
  }
  return entityCount;
}

function main() {
  // 清理旧生成目录，避免残留文件
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  ensureDir(outputDir);

  // 1. 处理各实体类型（逐文件输出）
  for (const config of entityConfigs) {
    const count = mergeAndWriteEntityFiles(config);
    console.log(`  ✓ ${config.key}: ${count} 条`);
  }

  // 2. 处理 basic-info（单文件）
  const cnBasicInfo = readJson(path.join(projectRoot, 'src/BREAK/basic-info/main.json'));
  const enBasicInfoPath = path.join(projectRoot, 'src/i18n/en/BREAK/basic-info/main.json');
  const enBasicInfo = fs.existsSync(enBasicInfoPath) ? readJson(enBasicInfoPath) : {};
  const mergedBasicInfo = mergeWithStructure(cnBasicInfo, enBasicInfo);
  writeJson(path.join(outputDir, 'basic-info.json'), mergedBasicInfo);
  console.log(`  ✓ basic-info: 已合并`);

  console.log(`\n✅ 英文完整数据生成完成 → ${path.relative(projectRoot, outputDir)}/`);
}

main();
