/**
 * 实体版本自动递增脚本
 *
 * 功能：检测 git staged / 未提交的实体文件变更，自动递增 version 字段并更新 updated 日期。
 *
 * 使用方式：
 *   node scripts/validate/auto-version.mjs            # 检测 HEAD 与工作区差异
 *   node scripts/validate/auto-version.mjs --dry-run   # 仅预览不写入
 *   node scripts/validate/auto-version.mjs --base HEAD~1  # 自定义对比基准
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';
import { ENTITY_DIRS, readGitFile, today } from './changed-entities.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const baseIdx = args.indexOf('--base');
const baseRef = baseIdx >= 0 && args[baseIdx + 1] ? args[baseIdx + 1] : 'HEAD';

// version 和 updated 字段不参与内容变更比较
const IGNORED_FIELDS = new Set(['version', 'updated']);

/**
 * 获取 git diff 中变更的实体文件列表
 * @returns {string[]} 相对于 projectRoot 的文件路径列表
 */
function getChangedEntityFiles() {
  const changed = new Set();

  // 获取已提交但相对 base 有变更的文件
  try {
    const committed = execFileSync(
      'git',
      ['diff', '--name-only', baseRef, '--', ...ENTITY_DIRS],
      { cwd: projectRoot, encoding: 'utf8' }
    ).trim();
    if (committed) {
      for (const file of committed.split('\n')) {
        if (file.endsWith('.json')) changed.add(file);
      }
    }
  } catch {
    // base ref 不存在时（首次提交等），回退使用工作区全部文件
  }

  // 获取暂存区 (staged) 但未提交的变更
  try {
    const staged = execFileSync(
      'git',
      ['diff', '--name-only', '--cached', '--', ...ENTITY_DIRS],
      { cwd: projectRoot, encoding: 'utf8' }
    ).trim();
    if (staged) {
      for (const file of staged.split('\n')) {
        if (file.endsWith('.json')) changed.add(file);
      }
    }
  } catch {
    // 忽略
  }

  // 获取工作区（未暂存）的变更
  try {
    const unstaged = execFileSync(
      'git',
      ['diff', '--name-only', '--', ...ENTITY_DIRS],
      { cwd: projectRoot, encoding: 'utf8' }
    ).trim();
    if (unstaged) {
      for (const file of unstaged.split('\n')) {
        if (file.endsWith('.json')) changed.add(file);
      }
    }
  } catch {
    // 忽略
  }

  return [...changed];
}

/**
 * 判断实体是否有实质性内容变更（排除 version 和 updated 字段）
 * 注意：auto-version 不排除横向关系字段（与 changed-entities.mjs 不同），
 * 因为横向关系字段变化也可能需要递增 version 以触发 i18n 重新合并。
 * @param {object} oldEntity - 旧版本实体数据
 * @param {object} newEntity - 新版本实体数据
 * @returns {boolean}
 */
function hasContentChange(oldEntity, newEntity) {
  if (!oldEntity || !newEntity) return true;

  const oldFiltered = {};
  const newFiltered = {};

  for (const [key, value] of Object.entries(oldEntity)) {
    if (!IGNORED_FIELDS.has(key)) oldFiltered[key] = value;
  }
  for (const [key, value] of Object.entries(newEntity)) {
    if (!IGNORED_FIELDS.has(key)) newFiltered[key] = value;
  }

  return JSON.stringify(oldFiltered) !== JSON.stringify(newFiltered);
}

// ────────────────────────────────────────
// 主流程
// ────────────────────────────────────────

const changedFiles = getChangedEntityFiles();

if (changedFiles.length === 0) {
  console.log('✅ 没有检测到实体文件变更，无需递增版本');
  process.exit(0);
}

console.log(`检测到 ${changedFiles.length} 个变更的实体文件（对比基准: ${baseRef}）\n`);

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
