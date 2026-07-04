// A 类机器强约束：updated 同步门禁
// 接入 validate:data 链。verdict：error
// 规则：
//   1. 实体内容字段（排除 version/updated/横向关系字段）相对 git base 有变但 updated≠today() → error
//   2. updated 格式非 YYYY-MM-DD → error
//   3. updated 未来日期 → error
//   4. BS 嵌套 riskDimensions[*].updated / riskScenes[*].updated 与顶层 updated 一致 → review
//
// 仅校验"变更实体"（git diff 检测），不扫全库（全库扫太慢且历史实体 updated 已固化）。
// 横向关系字段（relatedAvoidances/relatedAttackTools/relatedThreatActors/relatedRisks）
// 由 sync:lateral-relations 自动维护，其变化不触发 updated 更新（CLAUDE.md 字段说明）。

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { getChangedEntities, today, hasContentChange } from './changed-entities.mjs';

const STRICT = process.argv.includes('--strict');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayStr = today();

const issues = [];
const changed = await getChangedEntities({ baseRef: 'HEAD' });

for (const { type, key, entity, oldEntity, isNew } of changed) {
  // 新增实体：updated 应为 today（或近期），格式必须合法
  // 修改实体：updated 应为 today
  const updated = String(entity.updated || '').trim();

  // 格式校验（所有实体）
  if (!updated) {
    issues.push({ severity: 'error', type, key, type2: 'updated_missing', message: `${key}.updated 缺失（变更后必须更新为今日 ${todayStr}）` });
    continue;
  }
  if (!DATE_RE.test(updated)) {
    issues.push({ severity: 'error', type, key, type2: 'updated_invalid_format', message: `${key}.updated 格式非法 "${updated}"（需 YYYY-MM-DD）` });
    continue;
  }
  // 未来日期
  if (updated > todayStr) {
    issues.push({ severity: 'error', type, key, type2: 'updated_future', message: `${key}.updated 未来日期 "${updated}"` });
  }

  // 同步校验：内容变更但 updated 未刷新到 today
  // hasContentChange 已排除 version/updated/横向关系字段
  if (!isNew && hasContentChange(oldEntity, entity) && updated !== todayStr) {
    issues.push({ severity: 'error', type, key, type2: 'updated_stale', message: `${key}.updated="${updated}" 未刷新到今日 ${todayStr}（实体内容有变更）` });
  }
  // 新增实体 updated 应为 today（允许 ±1 天容差应对跨日提交，但严格模式要求 today）
  if (isNew && updated !== todayStr) {
    issues.push({ severity: 'error', type, key, type2: 'updated_not_today', message: `${key}.updated="${updated}" 新增实体应设为今日 ${todayStr}` });
  }

  // BS 嵌套 updated 一致性
  if (type === 'businessScenes') {
    const topUpdated = entity.updated;
    for (const [rdId, rd] of Object.entries(entity.riskDimensions || {})) {
      if (rd.updated && rd.updated !== topUpdated) {
        issues.push({ severity: 'review', type, key, type2: 'bs_nested_updated_mismatch', message: `${key}.riskDimensions.${rdId}.updated="${rd.updated}" 与顶层 updated="${topUpdated}" 不一致` });
      }
    }
    for (const [rsId, rs] of Object.entries(entity.riskScenes || {})) {
      if (rs.updated && rs.updated !== topUpdated) {
        issues.push({ severity: 'review', type, key, type2: 'bs_nested_updated_mismatch', message: `${key}.riskScenes.${rsId}.updated="${rs.updated}" 与顶层 updated="${topUpdated}" 不一致` });
      }
    }
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'updated-sync-gate.json'), {
  generatedAt: new Date().toISOString(),
  changedCount: changed.length,
  summary: {
    error: issues.filter((i) => i.severity === 'error').length,
    review: issues.filter((i) => i.severity === 'review').length,
  },
  issues,
});

console.log('\n=== updated 同步门禁 ===');
console.log(`检测到变更实体: ${changed.length}`);
console.log(`error: ${issues.filter((i) => i.severity === 'error').length}`);
console.log(`review: ${issues.filter((i) => i.severity === 'review').length}`);
for (const issue of issues.filter((i) => i.severity === 'error')) {
  console.log(`  ❌ ${issue.message}`);
}
for (const issue of issues.filter((i) => i.severity === 'review').slice(0, 20)) {
  console.log(`  🔍 ${issue.message}`);
}

if (STRICT && issues.some((i) => i.severity === 'error')) {
  console.log('\n❌ updated 同步存在 error 级问题，校验失败');
  process.exit(1);
}
if (!issues.some((i) => i.severity === 'error')) {
  console.log('\n✅ updated 同步无 error 级问题');
}
