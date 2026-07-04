// 全库指纹增量兜底：对全库所有实体跑 B/C 类评审（内容指纹增量，已评的不重跑）
// 用法：npm run review:full [-- --type=risks --limit=20]
// 适合周期性全库扫描，发现历史遗留问题

import { parseArgs } from './changed-entities.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'path';
import { projectRoot, ensureDir, writeJson } from '../search/common.mjs';

const opts = parseArgs(process.argv.slice(2));

const REVIEWERS = [
  'review-risk-avoidance.mjs',
  'review-risk-scene.mjs',
  'review-case-relation.mjs',
  'review-tool-risks.mjs',
  'review-actor-consistency.mjs',
  'review-term-completeness.mjs',
  'review-granularity.mjs',
  'review-should-extract.mjs',
  'review-references.mjs',
  'review-field-density.mjs',
  'review-classification.mjs',
  // review-case-fact 抓取成本高，全库兜底默认不跑，需显式 --include-case-fact
  ...(process.argv.includes('--include-case-fact') ? ['review-case-fact.mjs'] : []),
];

const summary = { generatedAt: new Date().toISOString(), reviewers: [], hasFail: false };

for (const script of REVIEWERS) {
  console.log(`\n--- 全库跑 ${script} ---`);
  const args = ['scripts/validate/' + script, '--full'];
  if (opts.type) args.push('--type=' + opts.type);
  if (opts.limit > 0) args.push('--limit=' + opts.limit);
  const reportName = script.replace('.mjs', '').replace('review-', '') + '-review';
  const reportPath = path.join(projectRoot, `research/search-reports/${reportName}/review-report.json`);
  let failCount = 0, reviewCount = 0, passCount = 0, totalCount = 0, error = null;
  try {
    execFileSync('node', args, { cwd: projectRoot, stdio: 'inherit', encoding: 'utf8' });
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      totalCount = report.length;
      failCount = report.filter((r) => r.verdict === 'fail').length;
      reviewCount = report.filter((r) => r.verdict === 'review').length;
      passCount = report.filter((r) => r.verdict === 'pass').length;
    }
  } catch (e) {
    error = String(e.message || e).slice(0, 300);
    failCount = 1;
  }
  summary.reviewers.push({ script, total: totalCount, pass: passCount, review: reviewCount, fail: failCount, error });
  if (failCount > 0) summary.hasFail = true;
}

const outDir = path.join(projectRoot, 'research/search-reports/review-full');
ensureDir(outDir);
writeJson(path.join(outDir, 'summary.json'), summary);

console.log(`\n========== review:full 汇总 ==========`);
for (const r of summary.reviewers) {
  console.log(`  ${r.script}: pass=${r.pass} review=${r.review} fail=${r.fail}${r.error ? ' ERROR' : ''}`);
}
process.exit(summary.hasFail ? 1 : 0);
