// A 类机器强约束：Term.category 沿用已有取值（不随意造新分类）
// verdict：review
// CLAUDE.md 字段说明：Term.category 是自由字符串，但"沿用已有取值，不要随意造新分类"。
// 新增 Term.category 不在 allowlist → review（需人工确认是否归并到已有分类或合理新增）。
// allowlist 文件：term-category-allowlist.json（可扩充）。

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const allowlistPath = path.join(__dirname, 'term-category-allowlist.json');

let allowlist = new Set();
try {
  const arr = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  if (Array.isArray(arr)) allowlist = new Set(arr);
} catch {
  // allowlist 缺失则空集（所有 category 都算新增）
}

const issues = [];
const terms = loadAllEntities('terms');

for (const { key, entity } of terms) {
  const cat = String(entity.category || '').trim();
  if (!cat) continue; // schema 已管必填
  if (!allowlist.has(cat)) {
    issues.push({
      severity: 'review',
      type: 'terms',
      key,
      title: entity.title,
      category: cat,
      type2: 'term_new_category',
      message: `${key}.category="${cat}" 不在已有取值集合（沿用已有分类，新增需确认或扩充 term-category-allowlist.json）`,
    });
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'term-category-enum.json'), {
  generatedAt: new Date().toISOString(),
  summary: { review: issues.length },
  issues,
});

console.log('\n=== Term.category 沿用枚举校验 ===');
console.log(`allowlist 已收录 ${allowlist.size} 个分类`);
console.log(`review: ${issues.length}`);
for (const issue of issues.slice(0, 30)) {
  console.log(`  🔍 ${issue.message}`);
}
if (!issues.length) {
  console.log('✅ 所有 Term.category 均在已有取值集合内');
}
