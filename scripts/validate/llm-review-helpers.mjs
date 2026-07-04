// LLM 评审辅助模块：全库加载 + title 索引 + 相关实体加载
// 补 common.mjs 的 loadEntities 对 terms/businessScenes 的缺口（不改 common.mjs）

import fs from 'node:fs';
import path from 'node:path';
import { loadEntities, projectRoot, parentKeyFor } from '../search/common.mjs';

// 支持 7 类实体 + avoidance-categories
const DIR_MAP = {
  risks: 'src/BREAK/risks',
  avoidances: 'src/BREAK/avoidances',
  'attack-tools': 'src/BREAK/attack-tools',
  'threat-actors': 'src/BREAK/threat-actors',
  terms: 'src/BREAK/terms',
  'business-scenes': 'src/BREAK/business-scenes',
  cases: 'src/BREAK/cases',
};

/**
 * 全库加载实体（支持 7 类，含 terms/businessScenes）
 * @param {string} type — risks/avoidances/attack-tools/threat-actors/terms/businessScenes/cases
 *                        （businessScenes / business-scenes 均可）
 * @returns {Array<{key,entityType,filePath,entity}>}
 */
export function loadAllEntities(type) {
  // 驼峰归一化：businessScenes → business-scenes
  const normType = type === 'businessScenes' ? 'business-scenes' : type;
  // common.mjs 支持的 5 类直接走它
  if (['risks', 'avoidances', 'attack-tools', 'threat-actors', 'cases'].includes(normType)) {
    return loadEntities(normType);
  }
  // terms / business-scenes 自实现
  const dir = path.join(projectRoot, DIR_MAP[normType]);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const filePath = path.join(dir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    for (const [key, entity] of Object.entries(data)) {
      out.push({ key, entityType: type, filePath, entity });
    }
  }
  return out;
}

// 归一化 title：去括号（含全角）、去空格、转小写、全角转半角、去间隔号/顿号、去首尾标点
export function normalizeTitle(title) {
  return String(title || '')
    .replace(/[（(].*?[)）]/g, '') // 去括号注释
    .replace(/[·、·]/g, '') // 去间隔号/顿号
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/[！？。，，；：、]/g, '') // 去标点
    .trim();
}

/**
 * 构建 title 索引：normalizedTitle → [{key, type, title}]
 * @param {{type?:string}} opts — 指定 type 则只索引该类型
 */
export function buildTitleIndex(opts = {}) {
  const index = new Map();
  const types = opts.type ? [opts.type] : Object.keys(DIR_MAP);
  for (const type of types) {
    const records = loadAllEntities(type);
    for (const { key, entity } of records) {
      const norm = normalizeTitle(entity.title);
      if (!norm) continue;
      if (!index.has(norm)) index.set(norm, []);
      index.get(norm).push({ key, type, title: entity.title });
    }
  }
  return index;
}

/**
 * 编辑距离（Levenshtein）
 */
export function levenshtein(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/**
 * 查找近义 title（编辑距离≤maxDist 且长度≥minLen）
 * @param {string} title
 * @param {{type?:string, maxDist?:number, minLen?:number}} opts
 * @returns {Array<{key,type,title,distance}>}
 */
export function findSimilarTitles(title, opts = {}) {
  const { type, maxDist = 2, minLen = 4 } = opts;
  const norm = normalizeTitle(title);
  if (norm.length < minLen) return [];
  const out = [];
  const types = type ? [type] : Object.keys(DIR_MAP);
  for (const t of types) {
    const records = loadAllEntities(t);
    for (const { key, entity } of records) {
      const eNorm = normalizeTitle(entity.title);
      if (eNorm === norm) continue; // 精确重复由 title-dedup 管
      if (eNorm.length < minLen) continue;
      const d = levenshtein(norm, eNorm);
      if (d <= maxDist) out.push({ key, type: t, title: entity.title, distance: d });
    }
  }
  return out.sort((a, b) => a.distance - b.distance);
}

/**
 * 加载一个实体引用的相关实体内容（供 subagent 交叉判断）
 * 只加载 title/definition/description 等关键字段（非全字段，控制上下文大小）
 * @param {string} type — 实体类型
 * @param {string[]} keys — 相关键 ID 列表
 * @param {string[]} fields — 要加载的字段（默认 title/definition/description）
 * @returns {Array<{key,title,fields}>}
 */
export function loadRelatedEntities(type, keys, fields = ['title', 'definition', 'description']) {
  if (!keys || !keys.length) return [];
  const records = loadAllEntities(type);
  const byKey = new Map(records.map((r) => [r.key, r.entity]));
  const out = [];
  for (const key of keys) {
    const ent = byKey.get(key);
    if (!ent) continue;
    const picked = {};
    for (const f of fields) {
      if (ent[f] != null) picked[f] = ent[f];
    }
    out.push({ key, title: ent.title, fields: picked });
  }
  return out;
}

/**
 * 加载全部 Avoidance（按 AC 分类），供 risk-missing-avoidance 评审
 */
export function loadAvoidancesByCategory() {
  const records = loadAllEntities('avoidances');
  const byCat = { AC01: [], AC02: [], AC03: [], AC04: [] };
  for (const { key, entity } of records) {
    const cat = entity.category || 'AC01';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({ key, title: entity.title, definition: entity.definition, description: String(entity.description || '').slice(0, 200) });
  }
  return byCat;
}

/**
 * 加载全部 BusinessScene 的 RS 语义（供 risk-other-business-scene 评审）
 * 返回 [{bsId, bsTitle, riskScenes: [{rsId, rsTitle, riskCount}]}]
 */
export function loadBusinessScenes() {
  const records = loadAllEntities('businessScenes');
  return records.map(({ key, entity }) => ({
    bsId: key,
    bsTitle: entity.title,
    bsDescription: entity.description || '',
    riskScenes: Object.entries(entity.riskScenes || {}).map(([rsId, rs]) => ({
      rsId,
      rsTitle: rs.title,
      riskCount: (rs.risks || []).length,
    })),
  }));
}

export { parentKeyFor };
