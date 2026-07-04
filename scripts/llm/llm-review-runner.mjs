// C 类纯 LLM 评审运行器（从 llm-review-avoidance-signal.mjs 提炼）
// 用于单实体语义判断（字段密度、category 贴切度等），不需跨实体交叉。
//
// 用法：
//   const results = await runReview({
//     name: 'field-density',
//     items: [{key, type, entity, ...extra}],
//     buildPrompt: (item) => [{role:'system',content:...},{role:'user',content:...}],
//     validateResult: (data) => {...}, // 失败 throw 触发重试
//     fingerprintFields: ['description','definition'],
//     model: 'text',
//     concurrency: 3,
//   });
//   // results: [{key, verdict, reason, suggestions, ...details, fingerprint, reviewedAt}]
//   // 退出码：有 fail→1，仅 review→0

import fs from 'fs';
import path from 'path';
import { createHash } from 'node:crypto';
import { projectRoot, ensureDir, writeJson } from '../search/common.mjs';
import { chatJson, withRetry, sleep } from './llm-client.mjs';

const REPORTS_DIR = path.join(projectRoot, 'research/search-reports');

export function fingerprintOf(entity, fields) {
  const content = fields.map((f) => String(entity?.[f] ?? '')).join('||');
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function loadProgress(progressPath, name) {
  if (fs.existsSync(progressPath)) {
    try {
      return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    } catch {
      // 损坏则重来
    }
  }
  // 本地 progress 不存在时，从入库基线加载已评指纹（换机器/CI 跳过已评存量）
  if (name) {
    const baselinePath = path.join(projectRoot, 'scripts/validate/review-progress-baseline.json');
    if (fs.existsSync(baselinePath)) {
      try {
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        if (baseline[name]) {
          return { done: baseline[name].done || {}, failed: baseline[name].failed || {} };
        }
      } catch {
        // baseline 损坏忽略
      }
    }
  }
  return { done: {}, failed: {} };
}

function saveProgress(progressPath, p) {
  writeJson(progressPath, p);
}

/**
 * 运行一轮 LLM 评审
 * @param {{
 *   name: string,                  — 评审名称（用作输出目录名）
 *   items: Array,                  — 待评审项 [{key, type, entity, ...extra}]
 *   buildPrompt: (item) => messages,
 *   validateResult: (data, item) => void,  — 校验 LLM 返回，失败 throw 触发重试
 *   fingerprintFields: string[],   — 用于计算指纹的字段（决定是否重评）
 *   model?: string,                — 'text'(默认) / 'multi'
 *   concurrency?: number,          — 默认 3
 *   limit?: number,                — 0=不限
 *   extraReport?: (all, mdLines) => void,  — 可选，追加 markdown 报告内容
 * }} opts
 * @returns {Promise<Array>}
 */
export async function runReview(opts) {
  const {
    name,
    items,
    buildPrompt,
    validateResult,
    fingerprintFields,
    model = 'text',
    concurrency = 3,
    limit = 0,
    extraReport,
  } = opts;

  const outDir = path.join(REPORTS_DIR, `${name}-review`);
  ensureDir(outDir);
  const reportPath = path.join(outDir, 'review-report.json');
  const progressPath = path.join(outDir, 'review-progress.json');
  const mdPath = path.join(outDir, 'review-report.md');
  const pendingPath = path.join(outDir, 'pending-fix.json');

  const progress = loadProgress(progressPath, name);
  let results = [];
  if (fs.existsSync(reportPath)) {
    try {
      results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch {
      results = [];
    }
  }
  const resultById = new Map(results.map((r) => [r.key, r]));

  // 增量：指纹与 progress.done 不一致才重评
  let todo = items.filter((it) => {
    const fp = fingerprintOf(it.entity, fingerprintFields);
    return progress.done[it.key] !== fp;
  });
  if (limit > 0) todo = todo.slice(0, limit);

  console.log(`[${name}] 共 ${items.length} 项，待评审 ${todo.length}（已完成 ${Object.keys(progress.done).length}）`);

  let done = 0;
  let failed = 0;
  const startMs = Date.now();

  async function reviewOne(item) {
    return withRetry(async () => {
      const data = await chatJson(buildPrompt(item), { model, timeoutMs: 90000 });
      validateResult(data, item);
      return data;
    }, { retries: 3 });
  }

  let idx = 0;
  async function worker() {
    while (idx < todo.length) {
      const item = todo[idx++];
      try {
        const data = await reviewOne(item);
        const r = {
          key: item.key,
          type: item.type || '',
          title: item.entity?.title || '',
          ...data,
          fingerprint: fingerprintOf(item.entity, fingerprintFields),
          reviewedAt: new Date().toISOString(),
        };
        resultById.set(item.key, r);
        progress.done[item.key] = r.fingerprint;
        delete progress.failed[item.key];
        done++;
        if (done % 20 === 0) {
          writeJson(reportPath, [...resultById.values()]);
          saveProgress(progressPath, progress);
          console.log(`  [${name}] 进度 ${done}/${todo.length}，${((Date.now() - startMs) / 1000).toFixed(0)}s`);
        }
      } catch (e) {
        failed++;
        progress.failed[item.key] = String(e.message || e).slice(0, 500);
        console.warn(`  [${name}] ✗ ${item.key}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const all = [...resultById.values()];
  writeJson(reportPath, all);
  saveProgress(progressPath, progress);

  // pending-fix：fail + review
  const pendingFix = all
    .filter((r) => r.verdict === 'fail' || r.verdict === 'review')
    .map((r) => ({
      key: r.key,
      type: r.type,
      title: r.title,
      verdict: r.verdict,
      reason: r.reason,
      suggestions: r.suggestions || [],
    }));
  writeJson(pendingPath, pendingFix);

  // markdown 报告
  fs.writeFileSync(mdPath, buildMarkdown(name, all, extraReport));

  const pass = all.filter((r) => r.verdict === 'pass').length;
  const review = all.filter((r) => r.verdict === 'review').length;
  const fail = all.filter((r) => r.verdict === 'fail').length;
  console.log(`[${name}] ✅ pass: ${pass}　🔍 review: ${review}　❌ fail: ${fail}（失败 ${failed}）`);

  return all;
}

function buildMarkdown(name, all, extraReport) {
  const lines = [];
  lines.push(`# ${name} LLM 评审报告`);
  lines.push('');
  lines.push(`生成时间：${new Date().toISOString()}`);
  lines.push(`总计：${all.length} 条`);
  lines.push('');
  const byV = { pass: [], review: [], fail: [] };
  for (const r of all) (byV[r.verdict] || (byV[r.verdict] = [])).push(r);
  lines.push(`- ✅ pass: ${byV.pass.length}`);
  lines.push(`- 🔍 review: ${byV.review.length}`);
  lines.push(`- ❌ fail: ${byV.fail.length}`);
  lines.push('');
  for (const v of ['fail', 'review']) {
    const list = byV[v];
    if (!list.length) continue;
    lines.push(`## ${v === 'fail' ? '❌ fail' : '🔍 review'} 清单（${list.length}）`);
    lines.push('');
    for (const r of list) {
      lines.push(`### ${r.key} — ${r.title || ''}`);
      lines.push(`- verdict: ${r.verdict}`);
      if (r.reason) lines.push(`- reason: ${r.reason}`);
      if (r.suggestions && r.suggestions.length) {
        lines.push(`- suggestions:`);
        for (const s of r.suggestions) lines.push(`  - ${s}`);
      }
      lines.push('');
    }
  }
  if (extraReport) {
    try {
      extraReport(all, lines);
    } catch {
      // 额外报告失败不影响主流程
    }
  }
  return lines.join('\n');
}

/**
 * 汇总退出码：有 fail 返回 1，否则 0
 */
export function exitCodeFor(results) {
  return results.some((r) => r.verdict === 'fail') ? 1 : 0;
}
