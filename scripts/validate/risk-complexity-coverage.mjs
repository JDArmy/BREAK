// A 类机器强约束：Risk.complexity 与 Avoidance 分类覆盖一致性
// verdict：review
// 规则：
//   advanced 风险的 avoidances 须覆盖 perception(感知) 或 detection(识别) —— 高级风险应有感知/识别手段
//   所有风险至少覆盖 2 个分类（防止→感知→识别→处置 的多环节覆盖）
// 子风险继承父风险的 complexity（schema 不强制，但语义上应一致）

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

const issues = [];
const risks = loadAllEntities('risks');
const avoidances = loadAllEntities('avoidances');
const avoidanceCatById = new Map();
for (const { key, entity } of avoidances) {
  avoidanceCatById.set(key, entity.category);
}

for (const { key, entity } of risks) {
  const complexity = entity.complexity;
  const avoidanceIds = Array.isArray(entity.avoidances) ? entity.avoidances : [];
  if (!avoidanceIds.length) continue; // check-entity-relations 已管空
  const cats = new Set();
  for (const aId of avoidanceIds) {
    const cat = avoidanceCatById.get(aId);
    if (cat) cats.add(cat);
  }
  const catList = [...cats];

  if (complexity === 'advanced') {
    if (!cats.has('perception') && !cats.has('detection')) {
      issues.push({
        severity: 'review',
        type: 'risks',
        key,
        title: entity.title,
        type2: 'advanced_risk_no_detection',
        message: `${key} [advanced] avoidances 未覆盖 perception(感知)/detection(识别)（当前分类: ${catList.join(',') || '无'}）—— 高级风险应有感知/识别手段`,
      });
    }
  }
  // 至少覆盖 2 个分类
  if (catList.length < 2) {
    issues.push({
      severity: 'review',
      type: 'risks',
      key,
      title: entity.title,
      type2: 'risk_single_ac_category',
        message: `${key} avoidances 仅覆盖 ${catList.length} 个分类（${catList.join(',') || '无'}）—— 应多环节覆盖（防止→感知→识别→处置）`,
    });
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'risk-complexity-coverage.json'), {
  generatedAt: new Date().toISOString(),
  summary: { review: issues.length },
  issues,
});

console.log('\n=== Risk.complexity 与规避分类覆盖一致性 ===');
console.log(`review: ${issues.length}`);
for (const issue of issues.slice(0, 40)) {
  console.log(`  🔍 ${issue.message}`);
}
if (issues.length > 40) console.log(`  ...另有 ${issues.length - 40} 条未显示`);
if (!issues.length) {
  console.log('✅ 所有 Risk 的 complexity 与 AC 覆盖一致');
}
