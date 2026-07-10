/**
 * 英文数据预构建脚本
 *
 * 读取中文 break-data.json 作为结构基底，
 * 遍历 src/i18n/en/BREAK/ 下的翻译文件并合并，
 * 输出 public/data/break-data-en.json。
 *
 * 合并规则复用 src/utils/mergeWithStructure.mjs：
 *   - keywords / aliases：英文整体替换
 *   - title / definition / description 等文本：英文覆盖
 *   - references[].title：按索引替换，保留 link
 *   - 结构字段（ID 数组、关系引用、updated）：保留中文源
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';
import { mergeWithStructure } from '../../src/utils/mergeWithStructure.mjs';

// ─── 配置 ───
const zhDataPath = path.join(projectRoot, 'public/data/break-data.json');
const outputPath = path.join(projectRoot, 'public/data/break-data-en.json');
const manifestPath = path.join(projectRoot, 'public/data/break-manifest.json');

const enDirConfigs = [
  { key: 'risks', dir: 'src/i18n/en/BREAK/risks' },
  { key: 'avoidances', dir: 'src/i18n/en/BREAK/avoidances' },
  { key: 'attackTools', dir: 'src/i18n/en/BREAK/attack-tools' },
  { key: 'threatActors', dir: 'src/i18n/en/BREAK/threat-actors' },
  { key: 'terms', dir: 'src/i18n/en/BREAK/terms' },
  { key: 'termCategories', dir: 'src/i18n/en/BREAK/term-categories' },
  { key: 'businessDomains', dir: 'src/i18n/en/BREAK/business-domains' },
  { key: 'avoidanceCategories', dir: 'src/i18n/en/BREAK/avoidance-categories' },
  { key: 'cases', dir: 'src/i18n/en/BREAK/cases' },
];

// ─── 加载英文翻译 ───
function loadEnTranslations(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  if (!fs.existsSync(dir)) return {};
  const merged = {};
  for (const file of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    Object.assign(merged, readJson(path.join(dir, file)));
  }
  return merged;
}

// ─── 主流程 ───
if (!fs.existsSync(zhDataPath)) {
  console.error(`❌ 中文数据文件不存在: ${zhDataPath}`);
  console.error('请先运行 npm run export:data 生成中文数据包');
  process.exit(1);
}

const zhBundle = readJson(zhDataPath);
const enData = {};

for (const config of enDirConfigs) {
  const zhEntities = zhBundle.data[config.key] || {};
  const enTranslations = loadEnTranslations(config.dir);
  const merged = {};
  for (const [entityId, zhEntity] of Object.entries(zhEntities)) {
    const enTrans = enTranslations[entityId];
    merged[entityId] = enTrans ? mergeWithStructure(zhEntity, enTrans) : zhEntity;
  }
  enData[config.key] = merged;
}

const enBundle = {
  schemaVersion: zhBundle.schemaVersion,
  packageVersion: zhBundle.packageVersion,
  generatedAt: zhBundle.generatedAt,
  locale: 'en',
  data: enData,
};

const enJson = `${JSON.stringify(enBundle, null, 2)}\n`;
const enSha256 = crypto.createHash('sha256').update(enJson).digest('hex');

ensureDir(path.dirname(outputPath));
fs.writeFileSync(outputPath, enJson);

// 更新 manifest，增加英文数据文件信息
if (fs.existsSync(manifestPath)) {
  const manifest = readJson(manifestPath);
  manifest.files.dataEn = {
    path: 'data/break-data-en.json',
    bytes: Buffer.byteLength(enJson),
    sha256: enSha256,
  };
  writeJson(manifestPath, manifest);
}

console.log('\n✅ 英文数据导出完成');
console.log(`output=${path.relative(projectRoot, outputPath)}`);
console.log(`bytes=${Buffer.byteLength(enJson)}`);
console.log(`sha256=${enSha256}`);
