// A 类机器强约束：Case.summary 与 relatedRisks/AttackTools/ThreatActors 交叉一致性
// verdict：review
// 规则：
//   summary 含 R/AT/TA 编号但该 ID ∉ related* → review（提及但未关联）
//   related* 中的 ID 在 summary 中完全未出现 → review（关联了但 summary 未提及）
// 注意：summary 可能用名称而非编号提及，故只对"编号出现"做强信号校验。

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

const ID_RE = /\b(?:AT|TA|R|C)\d{4}(?:-\d{3})?\b/g;
const issues = [];
const cases = loadAllEntities('cases');

for (const { key, entity } of cases) {
  const summary = String(entity.summary || '');
  const mentionedIds = new Set(summary.match(ID_RE) || []);

  const relatedRisks = new Set(Array.isArray(entity.relatedRisks) ? entity.relatedRisks : []);
  const relatedAT = new Set(Array.isArray(entity.relatedAttackTools) ? entity.relatedAttackTools : []);
  const relatedTA = new Set(Array.isArray(entity.relatedThreatActors) ? entity.relatedThreatActors : []);

  // summary 提及但未关联（排除 C 编号——summary 提及其他 Case 编号不算违规）
  for (const id of mentionedIds) {
    if (id.startsWith('C')) continue;
    if (id.startsWith('R') && !relatedRisks.has(id)) {
      issues.push({ severity: 'review', type: 'cases', key, type2: 'summary_mentions_unlinked', message: `${key}.summary 提及 ${id} 但未关联到 relatedRisks` });
    } else if (id.startsWith('AT') && !relatedAT.has(id)) {
      issues.push({ severity: 'review', type: 'cases', key, type2: 'summary_mentions_unlinked', message: `${key}.summary 提及 ${id} 但未关联到 relatedAttackTools` });
    } else if (id.startsWith('TA') && !relatedTA.has(id)) {
      issues.push({ severity: 'review', type: 'cases', key, type2: 'summary_mentions_unlinked', message: `${key}.summary 提及 ${id} 但未关联到 relatedThreatActors` });
    }
  }

  // 关联了但 summary 完全未提及编号（强信号：可能错配）
  // 注意：summary 用名称提及不算违规，故仅当 summary 含编号但没含该编号时才报
  // 此规则较严，改为：related* 中所有 ID 在 summary 中均无任何编号出现 → review
  const allRelated = [...relatedRisks, ...relatedAT, ...relatedTA];
  if (allRelated.length && mentionedIds.size === 0) {
    // summary 完全没有编号，无法强信号校验，跳过
    continue;
  }
  for (const id of allRelated) {
    if (!mentionedIds.has(id)) {
      // summary 提及了某些编号但没提这个——可能是用名称提及，仅 review
      issues.push({ severity: 'review', type: 'cases', key, type2: 'related_not_in_summary', message: `${key} 关联 ${id} 但 summary 未以编号提及（可能用名称，请核实）` });
    }
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'case-summary-relation-consistency.json'), {
  generatedAt: new Date().toISOString(),
  summary: { review: issues.length },
  issues,
});

console.log('\n=== Case.summary 与 related* 交叉一致性 ===');
console.log(`review: ${issues.length}`);
for (const issue of issues.slice(0, 40)) {
  console.log(`  🔍 ${issue.message}`);
}
if (issues.length > 40) console.log(`  ...另有 ${issues.length - 40} 条未显示`);
if (!issues.length) {
  console.log('✅ 所有 Case.summary 与 related* 一致');
}
