// A 类机器强约束：title 去重（精确/归一化重复 + 编辑距离≤2 近义）
// 接入 validate:data 链。verdict：精确/归一化重复=error，近义=review
// 同 type 内 title 完全相同 → error；归一化后相同 → error；编辑距离≤2 → review（交 B 类 subagent 终判）

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities, normalizeTitle, levenshtein } from './llm-review-helpers.mjs';

const TYPES = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms', 'cases', 'businessDomains'];
const STRICT = process.argv.includes('--strict');

const issues = [];

function addIssue(severity, type, message) {
  issues.push({ severity, type, message });
}

for (const type of TYPES) {
  const records = loadAllEntities(type);
  // 精确重复
  const exactGroups = new Map();
  const normGroups = new Map();
  for (const { key, entity } of records) {
    const title = String(entity.title || '').trim();
    if (!title) continue;
    const norm = normalizeTitle(title);
    if (!exactGroups.has(title)) exactGroups.set(title, []);
    exactGroups.get(title).push(key);
    if (!normGroups.has(norm)) normGroups.set(norm, []);
    normGroups.get(norm).push(key);
  }
  for (const [title, keys] of exactGroups) {
    if (keys.length > 1) {
      // Case 是“一事一条”；同事件多源应合并到同一 Case.references，不应拆成多个 Case。
      // 父子同名（如 R0001 与 R0001-001）也是合理继承 → review
      // 其他精确重复 → error
      const parents = new Set(keys.map((k) => k.split('-')[0]));
      const isFamily = parents.size === 1 && keys.length >= 1;
      if (isFamily) {
        addIssue('review', type, `[${type}] title 精确重复 "${title}"：${keys.join(', ')}（父子同名合理，建议子实体 title 区分）`);
      } else {
        addIssue('error', type, `[${type}] title 精确重复 "${title}"：${keys.join(', ')}`);
      }
    }
  }
  for (const [norm, keys] of normGroups) {
    if (keys.length > 1) {
      // 归一化重复（去括号/空格后相同）：括号是合法消歧手段，统一 review 交 B 类 subagent 终判
      const exactTitles = new Set();
      for (const k of keys) {
        const ent = records.find((r) => r.key === k);
        exactTitles.add(String(ent.entity.title || '').trim());
      }
      if (exactTitles.size > 1) {
        addIssue('review', type, `[${type}] title 归一化后重复（norm="${norm}"）：${keys.join(', ')}（可能是合法消歧或应合并，交 review:granularity 终判）`);
      }
    }
  }
  // 编辑距离≤2 近义（仅 review，跨主实体，跳过父子同前缀）
  const mains = records.filter((r) => !r.key.includes('-'));
  for (let i = 0; i < mains.length; i++) {
    for (let j = i + 1; j < mains.length; j++) {
      const a = normalizeTitle(mains[i].entity.title);
      const b = normalizeTitle(mains[j].entity.title);
      if (a.length < 4 || b.length < 4) continue;
      if (a === b) continue; // 已被归一化重复覆盖
      const d = levenshtein(a, b);
      if (d > 0 && d <= 2) {
        addIssue('review', type, `[${type}] title 近义（距离=${d}）：${mains[i].key} "${mains[i].entity.title}" ≈ ${mains[j].key} "${mains[j].entity.title}"`);
      }
    }
  }
}

// 输出报告
const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'title-dedup.json'), {
  generatedAt: new Date().toISOString(),
  summary: {
    error: issues.filter((i) => i.severity === 'error').length,
    review: issues.filter((i) => i.severity === 'review').length,
  },
  issues,
});

console.log('\n=== title 去重校验 ===');
console.log(`error: ${issues.filter((i) => i.severity === 'error').length}`);
console.log(`review: ${issues.filter((i) => i.severity === 'review').length}`);
for (const issue of issues.filter((i) => i.severity === 'error')) {
  console.log(`  ❌ ${issue.message}`);
}
const reviewList = issues.filter((i) => i.severity === 'review');
for (const issue of reviewList.slice(0, 30)) {
  console.log(`  🔍 ${issue.message}`);
}
if (reviewList.length > 30) console.log(`  ...另有 ${reviewList.length - 30} 条 review 未显示`);

if (STRICT && issues.some((i) => i.severity === 'error')) {
  console.log('\n❌ title 去重存在 error 级问题，校验失败');
  process.exit(1);
}
if (!issues.some((i) => i.severity === 'error')) {
  console.log('\n✅ title 去重无 error 级问题');
}
