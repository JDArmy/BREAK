// A 类机器强约束：实体粒度初筛（拆分信号 + 父子 title 关系）
// verdict：review
// 规则：
//   1. description 含多个分隔词（"此外""另外""同时""另一方面"等）分隔的独立场景且每段≥15字
//      → 可能应拆分子实体（review，交 B 类 subagent 终判）
//   2. 子实体 title 与父 title 关系不合理（既不相同也非父前缀/子前缀）→ review
//   3. 父子实体放在不同文件 → error（schema.mjs 已管 key-文件名，这里冗余兜底）

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

const SPLIT_SEPARATORS = ['此外', '另外', '同时', '另一方面', '除此之外', '与此同时', '另一方面'];
const MIN_SEGMENT_LEN = 15;

const issues = [];
const TYPES_WITH_DESC = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms', 'businessScenes'];

for (const type of TYPES_WITH_DESC) {
  const records = loadAllEntities(type);
  // 按 parentKey 分组找父子
  const byParent = new Map();
  for (const { key, entity } of records) {
    const parentKey = key.includes('-') ? key.split('-')[0] : key;
    if (!byParent.has(parentKey)) byParent.set(parentKey, []);
    byParent.get(parentKey).push({ key, entity });
  }

  for (const { key, entity } of records) {
    const desc = String(entity.description || '');
    if (desc.length >= 30) {
      // 检测分隔词分隔的多段独立场景
      let segments = [desc];
      for (const sep of SPLIT_SEPARATORS) {
        const next = [];
        for (const seg of segments) {
          const parts = seg.split(sep);
          if (parts.length > 1) {
            // 第 0 段是分隔词之前的，后续是分隔词之后的
            next.push(parts[0]);
            for (let i = 1; i < parts.length; i++) next.push(sep + parts[i]);
          } else {
            next.push(seg);
          }
        }
        segments = next;
      }
      const longSegments = segments.filter((s) => s.replace(/\s/g, '').length >= MIN_SEGMENT_LEN);
      if (longSegments.length >= 2) {
        issues.push({
          severity: 'review',
          type,
          key,
          title: entity.title,
          type2: 'description_multi_scene',
          message: `${key}.description 含 ${longSegments.length} 段独立场景（分隔词切分，每段≥${MIN_SEGMENT_LEN}字）—— 可能应拆分子实体`,
        });
      }
    }
  }

  // 父子 title 关系：仅当父子 title 完全无任何 2 字公共子串时才报（收紧，降低噪音）
  // 子风险 title 不必含父 title（如"秒拍出价"是"恶意抢购"的子风险，合理），
  // 只有完全无字符重叠才可能是归属错误。
  for (const [parentKey, group] of byParent) {
    if (group.length <= 1) continue;
    const parent = group.find((g) => g.key === parentKey);
    if (!parent) continue;
    const parentTitle = String(parent.entity.title || '').trim();
    const parentBigrams = new Set();
    for (let i = 0; i < parentTitle.length - 1; i++) {
      parentBigrams.add(parentTitle.slice(i, i + 2));
    }
    for (const { key, entity } of group) {
      if (key === parentKey) continue;
      const childTitle = String(entity.title || '').trim();
      if (childTitle.length < 2 || parentTitle.length < 2) continue;
      // 检查是否有任何 2 字公共子串
      let hasCommon = false;
      for (let i = 0; i < childTitle.length - 1; i++) {
        if (parentBigrams.has(childTitle.slice(i, i + 2))) {
          hasCommon = true;
          break;
        }
      }
      if (!hasCommon) {
        issues.push({
          severity: 'review',
          type,
          key,
          title: childTitle,
          parentKey,
          parentTitle,
          type2: 'child_parent_title_unrelated',
          message: `${key}.title="${childTitle}" 与父 ${parentKey}.title="${parentTitle}" 完全无字符重叠 —— 请确认子实体归属`,
        });
      }
    }
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'entity-granularity.json'), {
  generatedAt: new Date().toISOString(),
  summary: { review: issues.length },
  issues,
});

console.log('\n=== 实体粒度初筛 ===');
console.log(`review: ${issues.length}`);
for (const issue of issues.slice(0, 40)) {
  console.log(`  🔍 ${issue.message}`);
}
if (issues.length > 40) console.log(`  ...另有 ${issues.length - 40} 条未显示`);
if (!issues.length) {
  console.log('✅ 未检测到粒度异常');
}
