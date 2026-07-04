// A 类机器强约束：套话短语黑名单
// verdict：review
// 规则：description/limitation/influence/summary 含枚举套话短语 → review
// 这些短语是空话模板，无实质信息，应替换为具体内容。
// 黑名单可扩充（这里收录常见的"需重点关注""加强管理"类套话）。

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

// 套话短语黑名单（命中即 review）
const GENERIC_PHRASES = [
  '需重点关注',
  '需要重点关注',
  '加强管理',
  '加强监管',
  '提高警惕',
  '高度重视',
  '至关重要',
  '不容忽视',
  '不容小觑',
  '举足轻重',
  '综上所述',
  '众所周知',
  '落实责任',
  '强化意识',
  '完善制度',
  '亟需重视',
  '应该引起重视',
  '请相关人员注意',
  '请相关人员',
  '应给予重视',
];

const TYPE_FIELDS = {
  risks: ['definition', 'description', 'influence'],
  avoidances: ['definition', 'description', 'limitation'],
  'attack-tools': ['description'],
  'threat-actors': ['description'],
  terms: ['definition', 'description', 'usageExample'],
  cases: ['summary'],
};

const TYPES = Object.keys(TYPE_FIELDS);
const issues = [];

for (const type of TYPES) {
  const records = loadAllEntities(type);
  const fields = TYPE_FIELDS[type];
  for (const { key, entity } of records) {
    for (const field of fields) {
      const text = String(entity[field] || '');
      if (!text) continue;
      for (const phrase of GENERIC_PHRASES) {
        if (text.includes(phrase)) {
          issues.push({
            severity: 'review',
            type,
            key,
            field,
            phrase,
            type2: 'generic_phrase',
            message: `${key}.${field} 含套话短语 "${phrase}"（应替换为具体内容）`,
          });
          break; // 同字段命中一次即可
        }
      }
    }
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'generic-phrase-blocklist.json'), {
  generatedAt: new Date().toISOString(),
  summary: { review: issues.length },
  issues,
});

console.log('\n=== 套话短语黑名单校验 ===');
console.log(`review: ${issues.length}`);
for (const issue of issues.slice(0, 50)) {
  console.log(`  🔍 ${issue.message}`);
}
if (issues.length > 50) console.log(`  ...另有 ${issues.length - 50} 条未显示`);
if (!issues.length) {
  console.log('✅ 未检测到套话短语');
}
