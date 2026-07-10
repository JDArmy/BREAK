/**
 * 实体版本自动递增脚本（命令：npm run entity:version:bump）
 *
 * 功能：检测 git staged / 未提交的实体文件变更，自动递增实体级 version 字段并更新 updated 日期。
 * 注意：本脚本只处理实体级 version（触发 i18n 重新合并），不处理 package.json 的项目版本号——
 * 项目版本同步（package.json + main.json + CHANGELOG）请用 `npm run version:sync -- --bump=patch|minor|major`。
 *
 * 使用方式：
 *   node scripts/validate/auto-version.mjs            # 检测 HEAD 与工作区差异
 *   node scripts/validate/auto-version.mjs --dry-run   # 仅预览不写入
 *   node scripts/validate/auto-version.mjs --base HEAD~1  # 自定义对比基准
 *   node scripts/validate/auto-version.mjs --staged-only   # 仅暂存区变更（pre-commit 场景）
 *   node scripts/validate/auto-version.mjs --type terms    # 只处理指定实体目录
 */

import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';
import { getChangedEntityFiles, readGitFile, today } from './changed-entities.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const baseIdx = args.indexOf('--base');
const baseRef = baseIdx >= 0 && args[baseIdx + 1] ? args[baseIdx + 1] : 'HEAD';
const stagedOnly = args.includes('--staged-only');
const typeIdx = args.indexOf('--type');
const entityType = typeIdx >= 0 && args[typeIdx + 1] ? args[typeIdx + 1] : '';
const entityDirs = new Set(['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms', 'business-domains', 'cases']);
if (entityType && !entityDirs.has(entityType)) {
  console.error(`❌ --type 不支持 ${entityType}，可选值：${[...entityDirs].join(', ')}`);
  process.exit(1);
}

// version 和 updated 字段不参与内容变更比较
const IGNORED_FIELDS = new Set(['version', 'updated']);

// sync:lateral-relations 自动维护的横向关系字段也不参与（与 changed-entities.mjs 一致）：
// 横向关系字段由脚本重算，非人工实质变更，不触发 version 递增与 updated 更新（CLAUDE.md 字段说明）。
const LATERAL_FIELDS = new Set([
  'relatedAvoidances',
  'relatedAttackTools',
  'relatedThreatActors',
  'relatedRisks',
]);

/**
 * 判断实体是否有实质性内容变更（排除 version/updated/横向关系字段）
 * @param {object} oldEntity - 旧版本实体数据
 * @param {object} newEntity - 新版本实体数据
 * @returns {boolean}
 */
function hasContentChange(oldEntity, newEntity) {
  if (!oldEntity || !newEntity) return true;

  const oldFiltered = {};
  const newFiltered = {};

  for (const [key, value] of Object.entries(oldEntity)) {
    if (!IGNORED_FIELDS.has(key) && !LATERAL_FIELDS.has(key)) oldFiltered[key] = value;
  }
  for (const [key, value] of Object.entries(newEntity)) {
    if (!IGNORED_FIELDS.has(key) && !LATERAL_FIELDS.has(key)) newFiltered[key] = value;
  }

  return JSON.stringify(oldFiltered) !== JSON.stringify(newFiltered);
}

// ────────────────────────────────────────
// 主流程
// ────────────────────────────────────────

// 复用 changed-entities.mjs 的 getChangedEntityFiles（含 untracked 新文件检测，
// 避免本脚本自己维护一份 git diff 逻辑而漏掉 untracked）。
const changedFiles = getChangedEntityFiles({ baseRef, stagedOnly })
  .filter((file) => !entityType || file.startsWith(`src/BREAK/${entityType}/`));

if (changedFiles.length === 0) {
  console.log('✅ 没有检测到实体文件变更，无需递增版本');
  process.exit(0);
}

console.log(`检测到 ${changedFiles.length} 个变更的实体文件（对比基准: ${baseRef}${stagedOnly ? '，仅暂存区' : ''}）\n`);

const todayStr = today();
let bumpedCount = 0;

for (const relativePath of changedFiles) {
  const fullPath = path.join(projectRoot, relativePath);

  if (!fs.existsSync(fullPath)) {
    // 文件已删除，跳过
    continue;
  }

  const currentData = readJson(fullPath);
  const baseData = readGitFile(relativePath, baseRef);
  let fileModified = false;

  for (const [entityId, entity] of Object.entries(currentData)) {
    const baseEntity = baseData?.[entityId] ?? null;

    if (!hasContentChange(baseEntity, entity)) {
      continue;
    }

    const oldVersion = entity.version ?? 1;
    const newVersion = baseEntity ? (baseEntity.version ?? 1) + 1 : oldVersion;

    // 只有当 version 确实需要递增时才修改
    if (newVersion > oldVersion || !entity.version) {
      entity.version = newVersion;
      entity.updated = todayStr;
      fileModified = true;
      bumpedCount++;

      const action = baseEntity ? `${baseEntity.version ?? 1} → ${newVersion}` : `初始化为 ${newVersion}`;
      console.log(`  ${entityId}: version ${action}`);
    }
  }

  if (fileModified && !dryRun) {
    writeJson(fullPath, currentData);
  }
}

console.log(
  `\n${dryRun ? '🔍 预览模式' : '✅ 完成'}：${bumpedCount} 个实体的 version 已${dryRun ? '需要' : ''}递增`
);
