// 变更实体检测共享模块（抽自 auto-version.mjs）
// 供 auto-version.mjs 与 review:* 脚本共用，避免逻辑分叉。
//
// 导出：
//   ENTITY_DIRS         — 需追踪的实体目录（相对 projectRoot）
//   getChangedEntities({baseRef, stagedOnly}) → [{type,key,filePath,entity,oldEntity,isNew,hasContentChange}]
//   readGitFile(relativePath, baseRef)        — 读 git base ref 中的文件 JSON
//   hasContentChange(oldEntity, newEntity)    — 排除 version/updated/横向关系字段后的实质变更判定
//   today()                                   — YYYY-MM-DD
//   parseArgs(argv)                           — 解析 --base/--full/--staged-only/--keys=/--limit= 等
//   ENTITY_TYPE_BY_DIR                        — 目录名→规范 type 映射

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson } from '../search/common.mjs';

export const ENTITY_DIRS = [
  'src/BREAK/risks',
  'src/BREAK/avoidances',
  'src/BREAK/attack-tools',
  'src/BREAK/threat-actors',
  'src/BREAK/terms',
  'src/BREAK/business-domains',
  'src/BREAK/cases',
];

// 目录名 → 规范 type（与 common.mjs entityConfigs 的 key 对齐，attack-tools 保留中划线）
export const ENTITY_TYPE_BY_DIR = {
  risks: 'risks',
  avoidances: 'avoidances',
  'attack-tools': 'attack-tools',
  'threat-actors': 'threat-actors',
  terms: 'terms',
  'business-domains': 'businessDomains',
  cases: 'cases',
};

// version 和 updated 字段不参与内容变更比较
const IGNORED_FIELDS = new Set(['version', 'updated']);

// sync:lateral-relations 自动维护的横向关系字段也不参与（脚本重算，非人工实质变更）
const LATERAL_FIELDS = new Set([
  'relatedAvoidances',
  'relatedAttackTools',
  'relatedThreatActors',
  'relatedRisks',
]);

export function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 判断实体是否有实质性内容变更（排除 version/updated/横向关系字段）
 */
export function hasContentChange(oldEntity, newEntity) {
  if (!oldEntity || !newEntity) return true;
  const filter = (ent) => {
    const out = {};
    for (const [k, v] of Object.entries(ent)) {
      if (!IGNORED_FIELDS.has(k) && !LATERAL_FIELDS.has(k)) out[k] = v;
    }
    return out;
  };
  return JSON.stringify(filter(oldEntity)) !== JSON.stringify(filter(newEntity));
}

/**
 * 读 git base ref 中的文件内容
 */
export function readGitFile(relativePath, baseRef = 'HEAD') {
  try {
    const content = execFileSync(
      'git',
      ['show', `${baseRef}:${relativePath}`],
      { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 获取 git diff 中变更的实体文件列表（相对 projectRoot）
 * @param {{baseRef?:string, stagedOnly?:boolean}} opts
 */
export function getChangedEntityFiles({ baseRef = 'HEAD', stagedOnly = false } = {}) {
  const changed = new Set();

  const run = (args) => {
    try {
      const out = execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' }).trim();
      if (out) for (const f of out.split('\n')) if (f.endsWith('.json')) changed.add(f);
    } catch {
      // base ref 不存在等
    }
  };

  if (!stagedOnly) {
    run(['diff', '--name-only', baseRef, '--', ...ENTITY_DIRS]);
  }
  run(['diff', '--name-only', '--cached', '--', ...ENTITY_DIRS]);
  if (!stagedOnly) {
    run(['diff', '--name-only', '--', ...ENTITY_DIRS]);
    // untracked 新文件（git diff 不显示，需 ls-files --others）
    run(['ls-files', '--others', '--exclude-standard', '--', ...ENTITY_DIRS]);
  }
  return [...changed];
}

function inferType(filePath) {
  // src/BREAK/<dir>/R0001.json
  const m = filePath.match(/src\/BREAK\/([^/]+)\//);
  if (!m) return null;
  return ENTITY_TYPE_BY_DIR[m[1]] || m[1];
}

/**
 * 获取变更实体清单（含新旧内容对比）
 * @param {{baseRef?:string, stagedOnly?:boolean}} opts
 * @returns {Promise<Array<{type:string,key:string,filePath:string,entity:object,oldEntity:object|null,isNew:boolean,hasContentChange:boolean}>>}
 */
export async function getChangedEntities({ baseRef = 'HEAD', stagedOnly = false } = {}) {
  const files = getChangedEntityFiles({ baseRef, stagedOnly });
  const out = [];
  for (const relativePath of files) {
    const fullPath = path.join(projectRoot, relativePath);
    const type = inferType(relativePath);
    if (!type) continue;
    if (!existsSync(fullPath)) continue; // 已删除
    let currentData;
    try {
      currentData = readJson(fullPath);
    } catch {
      continue; // JSON 非法由 schema.mjs 报
    }
    const baseData = readGitFile(relativePath, baseRef);
    for (const [key, entity] of Object.entries(currentData)) {
      const oldEntity = baseData?.[key] ?? null;
      const isNew = !oldEntity;
      const changed = hasContentChange(oldEntity, entity);
      if (isNew || changed) {
        out.push({ type, key, filePath: fullPath, entity, oldEntity, isNew, hasContentChange: changed });
      }
    }
  }
  return out;
}

/**
 * 解析 CLI 参数
 *   --base <ref>        自定义对比基准（默认 HEAD）
 *   --full              忽略 diff，全库评审
 *   --staged-only       仅暂存区变更
 *   --keys=R0001,A0001  仅评审指定 key（逗号分隔）
 *   --limit=N           限制数量
 *   --type=risks        按类型过滤
 *   --skip=case-fact   跳过某子评审
 */
export function parseArgs(argv) {
  const opts = { baseRef: 'HEAD', full: false, stagedOnly: false, keys: null, limit: 0, type: null, skip: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--full') opts.full = true;
    else if (a === '--staged-only') opts.stagedOnly = true;
    else if (a === '--base') opts.baseRef = argv[++i];
    else if (a.startsWith('--base=')) opts.baseRef = a.slice(7);
    else if (a.startsWith('--keys=')) opts.keys = a.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--limit=')) opts.limit = Number(a.slice(8)) || 0;
    else if (a.startsWith('--type=')) opts.type = a.slice(7);
    else if (a.startsWith('--skip=')) opts.skip.push(a.slice(7));
  }
  return opts;
}
