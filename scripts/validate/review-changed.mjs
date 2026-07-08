// 编排器：变更实体分派到 B/C 类 subagent+LLM 评审 + 汇总
// 用法：npm run review:changed [-- --base HEAD~1 --keys=R0001 --skip=case-fact]
// 退出码：任一子评审有 fail → 1；全 pass/review → 0

import fs from 'fs';
import path from 'path';
import { projectRoot, ensureDir, writeJson } from '../search/common.mjs';
import { getChangedEntities, parseArgs } from './changed-entities.mjs';

const opts = parseArgs(process.argv.slice(2));
const skip = new Set(opts.skip);

function nowForLog() {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

function secondsSince(ms) {
  return ((Date.now() - ms) / 1000).toFixed(1);
}

// 子评审配置：[name, script, appliesToTypes]
const REVIEWERS = [
  ['risk-avoidance', 'review-risk-avoidance.mjs', ['risks']],
  ['risk-scene', 'review-risk-scene.mjs', ['risks']],
  ['case-relation', 'review-case-relation.mjs', ['cases']],
  ['tool-risks', 'review-tool-risks.mjs', ['attack-tools']],
  ['actor-consistency', 'review-actor-consistency.mjs', ['threat-actors']],
  ['term-completeness', 'review-term-completeness.mjs', ['terms']],
  ['granularity', 'review-granularity.mjs', ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms']],
  ['should-extract', 'review-should-extract.mjs', ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms']],
  ['references', 'review-references.mjs', ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms', 'cases']],
  ['field-density', 'review-field-density.mjs', ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms', 'cases']],
  ['classification', 'review-classification.mjs', ['risks', 'avoidances', 'cases', 'terms']],
  ['case-fact', 'review-case-fact.mjs', ['cases']],
];

// 收集变更实体
// 透传 stagedOnly：pre-commit hook 用 --staged-only 调用，仅评审已暂存实体，
// 避免未暂存的工作区改动 fail 阻断无关提交。
const changed = opts.full ? [] : await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
const changedTypes = new Set(changed.map((c) => c.type));

// 决定要跑哪些子评审
const toRun = REVIEWERS.filter(([name, , types]) => {
  if (skip.has(name)) return false;
  if (opts.full) return true;
  // 变更模式：仅跑有变更实体类型的子评审
  return types.some((t) => changedTypes.has(t));
});

console.log(`\n========== review:changed 编排 ==========`);
console.log(`变更实体类型：${opts.full ? '(全库模式)' : [...changedTypes].join(', ') || '(无变更)'}`);
console.log(`变更实体数量：${changed.length}`);
console.log(`待跑子评审：${toRun.map((r) => r[0]).join(', ') || '(无)'}\n`);

if (!toRun.length) {
  console.log('✅ 无变更实体需评审');
  process.exit(0);
}

// 逐个子评审跑（顺序，避免 LLM 并发过高）
const summary = { generatedAt: new Date().toISOString(), reviewers: [], hasFail: false };

for (const [name, script, types] of toRun) {
  const reviewerStartMs = Date.now();
  console.log(`\n[${nowForLog()}] --- 跑 ${name}（${script}）---`);
  // 构造 args：传 --base 和可选 --keys/--limit/--staged-only
  const args = ['scripts/validate/' + script];
  if (opts.baseRef && !opts.full) args.push('--base', opts.baseRef);
  if (opts.stagedOnly) args.push('--staged-only');
  if (opts.full) args.push('--full');
  if (opts.keys) args.push('--keys=' + opts.keys.join(','));
  if (opts.limit > 0) args.push('--limit=' + opts.limit);

  // 读取该子评审的报告 JSON（子脚本已跑完会落盘）
  const reportPath = path.join(projectRoot, `research/search-reports/${name}-review/review-report.json`);
  let failCount = 0;
  let reviewCount = 0;
  let passCount = 0;
  let totalCount = 0;
  let error = null;
  let subprocessExit1 = false;
  try {
    const { execFileSync } = await import('node:child_process');
    console.log(`[${nowForLog()}] review:changed 启动 ${name}: node ${args.join(' ')}`);
    execFileSync('node', args, { cwd: projectRoot, stdio: 'inherit', encoding: 'utf8' });
  } catch (e) {
    // 子脚本 exit 1：可能是 fail（门禁阻断，报告已落盘）或崩溃（报告可能未落盘）
    error = String(e.message || e).slice(0, 300);
    subprocessExit1 = true;
  }
  console.log(`[${nowForLog()}] review:changed 完成 ${name}: ${secondsSince(reviewerStartMs)}s`);
  // 读取报告（无论子脚本是否 exit 1，报告可能已落盘）
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      totalCount = report.length;
      failCount = report.filter((r) => r.verdict === 'fail').length;
      reviewCount = report.filter((r) => r.verdict === 'review').length;
      passCount = report.filter((r) => r.verdict === 'pass').length;
    } catch {
      // 报告损坏
    }
  }
  // 子脚本 exit 1 但报告无 fail 记录 → 可能是崩溃或子脚本本身报错，记为 fail 阻断
  if (subprocessExit1 && failCount === 0) {
    failCount = 1;
  }
  summary.reviewers.push({ name, types, total: totalCount, pass: passCount, review: reviewCount, fail: failCount, error });
  if (failCount > 0) summary.hasFail = true;
}

// 汇总
const outDir = path.join(projectRoot, 'research/search-reports/review-changed');
ensureDir(outDir);
writeJson(path.join(outDir, 'summary.json'), summary);

const mdLines = [
  '# review:changed 汇总报告',
  '',
  `生成时间：${summary.generatedAt}`,
  `变更实体类型：${opts.full ? '(全库模式)' : [...changedTypes].join(', ') || '(无变更)'}`,
  '',
  '| 子评审 | 类型 | 总计 | pass | review | fail | 错误 |',
  '| --- | --- | ---: | ---: | ---: | ---: | --- |',
];
for (const r of summary.reviewers) {
  mdLines.push(`| ${r.name} | ${r.types.join(',')} | ${r.total} | ${r.pass} | ${r.review} | ${r.fail} | ${r.error || ''} |`);
}
mdLines.push('', summary.hasFail ? '❌ 存在 fail 级问题' : '✅ 无 fail 级问题');
fs.writeFileSync(path.join(outDir, 'summary.md'), mdLines.join('\n'));

console.log(`\n========== 汇总 ==========`);
for (const r of summary.reviewers) {
  console.log(`  ${r.name}: pass=${r.pass} review=${r.review} fail=${r.fail}${r.error ? ' ERROR=' + r.error : ''}`);
}
console.log(summary.hasFail ? '\n❌ 存在 fail 级问题，review:changed 失败' : '\n✅ review:changed 通过（无 fail）');

process.exit(summary.hasFail ? 1 : 0);
