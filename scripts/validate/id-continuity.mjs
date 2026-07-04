// A 类机器强约束：ID 连续性（跳号检测）
// verdict：review
// 规则：各 type 主 ID 序列应连续，跳号（如 R0278 后新增 R0280 缺 R0279）→ review
// 跳号可能是删除遗留，需人工确认是否补位或调整新 ID。

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

const TYPE_CONFIG = [
  { type: 'risks', prefix: 'R', digits: 4 },
  { type: 'avoidances', prefix: 'A', digits: 4 },
  { type: 'attack-tools', prefix: 'AT', digits: 4 },
  { type: 'threat-actors', prefix: 'TA', digits: 4 },
  { type: 'terms', prefix: 'T', digits: 4 },
  { type: 'cases', prefix: 'C', digits: 4 },
  { type: 'business-scenes', prefix: 'BS', digits: 2 },
];

const issues = [];

for (const { type, prefix, digits } of TYPE_CONFIG) {
  const records = loadAllEntities(type);
  // 只取主 ID（不含 -NNN）
  const mainIds = records
    .map((r) => r.key)
    .filter((k) => !k.includes('-'))
    .map((k) => Number(k.slice(prefix.length)))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);

  if (!mainIds.length) continue;
  const min = mainIds[0];
  const max = mainIds[mainIds.length - 1];
  const set = new Set(mainIds);
  const gaps = [];
  for (let n = min; n <= max; n++) {
    if (!set.has(n)) {
      gaps.push(prefix + String(n).padStart(digits, '0'));
    }
  }
  if (gaps.length) {
    issues.push({
      severity: 'review',
      type,
      type2: 'id_continuity_gap',
      message: `[${type}] ID 序列跳号，缺失 ${gaps.length} 个：${gaps.slice(0, 10).join(', ')}${gaps.length > 10 ? ` ...` : ''}（当前范围 ${prefix}${String(min).padStart(digits, '0')}~${prefix}${String(max).padStart(digits, '0')}，新 ID 应从 ${prefix}${String(max + 1).padStart(digits, '0')} 起）`,
    });
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'id-continuity.json'), {
  generatedAt: new Date().toISOString(),
  summary: { review: issues.length },
  issues,
});

console.log('\n=== ID 连续性校验 ===');
console.log(`review: ${issues.length}`);
for (const issue of issues) {
  console.log(`  🔍 ${issue.message}`);
}
if (!issues.length) {
  console.log('✅ 所有 type 主 ID 序列连续，无跳号');
}
