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

function nowForLog() {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

function secondsSince(ms) {
  return ((Date.now() - ms) / 1000).toFixed(1);
}

export function fingerprintOf(entity, fields) {
  // 对对象/数组字段（如 references）做 JSON 序列化，避免 String([obj]) 得到 "[object Object]" 不区分内容。
  const content = fields
    .map((f) => {
      const v = entity?.[f];
      if (v == null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    })
    .join('||');
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function loadProgress(progressPath, name) {
  // 从入库基线加载已评指纹（换机器/CI 跳过已评存量）。
  // 关键：基线为底、本地覆盖——即便本地 progress 已存在（哪怕只评了 1 条），
  // 也要把基线 done 中本地缺失的 key 补入，避免本地过时 progress 屏蔽基线导致 CI 重评全库。
  let baselineDone = {};
  let baselineFailed = {};
  if (name) {
    const baselinePath = path.join(projectRoot, 'scripts/validate/review-progress-baseline.json');
    if (fs.existsSync(baselinePath)) {
      try {
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        if (baseline[name]) {
          baselineDone = baseline[name].done || {};
          baselineFailed = baseline[name].failed || {};
        }
      } catch {
        // baseline 损坏忽略
      }
    }
  }

  if (fs.existsSync(progressPath)) {
    try {
      const local = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
      // 合并：基线为底，本地 done 覆盖（本地是最新评的）；本地没有的 key 用基线补。
      const mergedDone = { ...baselineDone, ...(local.done || {}) };
      const mergedFailed = { ...baselineFailed, ...(local.failed || {}) };
      return { done: mergedDone, failed: mergedFailed };
    } catch {
      // 损坏则用基线
      return { done: baselineDone, failed: baselineFailed };
    }
  }
  return { done: baselineDone, failed: baselineFailed };
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
 *   promptVersion?: string,        — 评审规则版本，变更后使旧结论自动失效
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
    promptVersion = '',
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

  // 本次评审的 scope：items 传入的 key 集合。
  // report 与退出码都只看 scope 内的 key，避免历史累积结果（如全库跑留下的其他实体 fail）
  // 永久阻断后续 changed-mode 提交。scope 外的历史结果不写入本次 report。
  const scopeKeys = new Set(items.map((it) => it.key));
  const reviewFingerprint = (entity) => `${promptVersion ? `${promptVersion}:` : ''}${fingerprintOf(entity, fingerprintFields)}`;

  // 增量：指纹与 progress.done 不一致才重评
  let todo = items.filter((it) => {
    const fp = reviewFingerprint(it.entity);
    return progress.done[it.key] !== fp;
  });
  if (limit > 0) todo = todo.slice(0, limit);

  console.log(`[${nowForLog()}] [${name}] 共 ${items.length} 项，待评审 ${todo.length}（已完成 ${Object.keys(progress.done).length}），并发 ${concurrency}，模型 ${model}`);

  let done = 0;
  let failed = 0;
  const startMs = Date.now();
  const totalTodo = todo.length;

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
      const current = idx;
      const itemStartMs = Date.now();
      console.log(`[${nowForLog()}] [${name}] ▶ ${current}/${totalTodo} ${item.key} ${item.entity?.title || ''}`);
      try {
        const data = await reviewOne(item);
        const r = {
          key: item.key,
          type: item.type || '',
          title: item.entity?.title || '',
          ...data,
          fingerprint: reviewFingerprint(item.entity),
          reviewedAt: new Date().toISOString(),
        };
        resultById.set(item.key, r);
        progress.done[item.key] = r.fingerprint;
        delete progress.failed[item.key];
        done++;
        console.log(`[${nowForLog()}] [${name}] ✓ ${current}/${totalTodo} ${item.key} verdict=${r.verdict} ${secondsSince(itemStartMs)}s`);
        if (done % 20 === 0) {
          writeJson(reportPath, [...resultById.values()]);
          saveProgress(progressPath, progress);
          console.log(`[${nowForLog()}] [${name}] 进度 done=${done}/${todo.length} failed=${failed} elapsed=${secondsSince(startMs)}s`);
        }
      } catch (e) {
        failed++;
        progress.failed[item.key] = String(e.message || e).slice(0, 500);
        console.warn(`[${nowForLog()}] [${name}] ✗ ${current}/${totalTodo} ${item.key} ${secondsSince(itemStartMs)}s: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // report 裁剪到本次 scope：只保留 items 范围内的结果。
  // scope 内 todo 已重评的用新结果；todo 外（指纹未变）的取 resultById 历史结果（仍有效）。
  // scope 外的历史结果（如全库跑留下的其他实体）不写入，避免累积报告导致 changed-mode 永久 fail。
  const all = items
    .map((it) => resultById.get(it.key))
    .filter(Boolean);
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
  console.log(`[${nowForLog()}] [${name}] 完成 elapsed=${secondsSince(startMs)}s pass=${pass} review=${review} fail=${fail}（调用失败 ${failed}）`);

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
