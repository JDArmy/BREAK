// A 类机器强约束：Term.title 格式违规（CLAUDE.md L269 明确禁止）
// 接入 validate:data 链。verdict：
//   含括号注释/间隔号·/顿号 → error
//   过长（strippedLen > 15）→ review
// 参照 CLAUDE.md「术语专用」章节：title 应为简短名词，避免括号注释、间隔号串联、过长表述

import fs from 'fs';
import path from 'path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

const STRICT = process.argv.includes('--strict');
const TITLE_MAX_LEN = 15;

const issues = [];
const terms = loadAllEntities('terms');

for (const { key, entity } of terms) {
  const title = String(entity.title || '').trim();
  if (!title) continue;
  const strippedLen = [...title].filter((ch) => !/\s/.test(ch)).length;

  // 括号注释（全角/半角）
  if (/[（(].*?[)）]/.test(title)) {
    issues.push({
      severity: 'error',
      key,
      title,
      type: 'title_parenthesis',
      message: `${key}.title 含括号注释 "${title}"（括号内容应放 aliases）`,
    });
  }
  // 间隔号 ·
  if (/[·・]/.test(title)) {
    issues.push({
      severity: 'error',
      key,
      title,
      type: 'title_separator_dot',
      message: `${key}.title 含间隔号 "${title}"（应拆分或聚焦单一概念）`,
    });
  }
  // 顿号
  if (/、/.test(title)) {
    issues.push({
      severity: 'error',
      key,
      title,
      type: 'title_comma',
      message: `${key}.title 含顿号 "${title}"（应拆分或聚焦单一概念）`,
    });
  }
  // 过长
  if (strippedLen > TITLE_MAX_LEN) {
    issues.push({
      severity: 'review',
      key,
      title,
      type: 'title_too_long',
      message: `${key}.title 过长（>${TITLE_MAX_LEN}字，当前 ${strippedLen}）"${title}"`,
    });
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'title-format.json'), {
  generatedAt: new Date().toISOString(),
  summary: {
    error: issues.filter((i) => i.severity === 'error').length,
    review: issues.filter((i) => i.severity === 'review').length,
  },
  issues,
});

console.log('\n=== Term.title 格式校验 ===');
console.log(`error: ${issues.filter((i) => i.severity === 'error').length}`);
console.log(`review: ${issues.filter((i) => i.severity === 'review').length}`);
for (const issue of issues.filter((i) => i.severity === 'error')) {
  console.log(`  ❌ ${issue.message}`);
}
for (const issue of issues.filter((i) => i.severity === 'review').slice(0, 20)) {
  console.log(`  🔍 ${issue.message}`);
}

if (STRICT && issues.some((i) => i.severity === 'error')) {
  console.log('\n❌ Term.title 格式存在 error 级问题，校验失败');
  process.exit(1);
}
if (!issues.some((i) => i.severity === 'error')) {
  console.log('\n✅ Term.title 格式无 error 级问题');
}
