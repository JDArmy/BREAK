// 存量评审基线导出/加载
// 把 research/search-reports/*-review/review-progress.json 的 done 指纹合并导出到
// scripts/validate/review-progress-baseline.json（入库），供换机器/CI 跳过已评存量。
//
// 用法：
//   node scripts/validate/review-baseline.mjs --export   # 导出当前 progress 到 baseline
//   node scripts/validate/review-baseline.mjs --import   # baseline 加载到各 progress（通常 runner 自动加载）

import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson, writeJson, ensureDir } from '../search/common.mjs';

const REPORTS_DIR = path.join(projectRoot, 'research/search-reports');
const BASELINE_PATH = path.join(projectRoot, 'scripts/validate/review-progress-baseline.json');

const REVIEW_NAMES = [
  'risk-avoidance',
  'risk-scene',
  'case-relation',
  'tool-risks',
  'actor-consistency',
  'term-completeness',
  'granularity',
  'should-extract',
  'references',
  'case-fact',
  'field-density',
  'classification',
];

function loadProgressFile(reviewName) {
  const p = path.join(REPORTS_DIR, reviewName + '-review', 'review-progress.json');
  if (!fs.existsSync(p)) return { done: {}, failed: {} };
  try {
    return readJson(p);
  } catch {
    return { done: {}, failed: {} };
  }
}

function exportBaseline() {
  const baseline = {};
  let totalDone = 0;
  for (const reviewName of REVIEW_NAMES) {
    const p = loadProgressFile(reviewName);
    baseline[reviewName] = { done: p.done || {}, failed: p.failed || {} };
    totalDone += Object.keys(p.done || {}).length;
  }
  writeJson(BASELINE_PATH, baseline);
  console.log('✅ 已导出基线到 ' + path.relative(projectRoot, BASELINE_PATH));
  console.log('   ' + REVIEW_NAMES.length + ' 个评审，共 ' + totalDone + ' 条已评指纹');
  for (const reviewName of REVIEW_NAMES) {
    const n = Object.keys(baseline[reviewName].done).length;
    if (n) console.log('   - ' + reviewName + ': ' + n);
  }
}

function importBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.log('❌ 基线文件不存在，先跑 --export');
    process.exit(1);
  }
  const baseline = readJson(BASELINE_PATH);
  let imported = 0;
  for (const reviewName of REVIEW_NAMES) {
    if (!baseline[reviewName]) continue;
    const dir = path.join(REPORTS_DIR, reviewName + '-review');
    ensureDir(dir);
    const p = path.join(dir, 'review-progress.json');
    const current = fs.existsSync(p) ? readJson(p) : { done: {}, failed: {} };
    for (const [k, v] of Object.entries(baseline[reviewName].done || {})) {
      if (!(k in (current.done || {}))) {
        current.done = current.done || {};
        current.done[k] = v;
        imported++;
      }
    }
    writeJson(p, current);
  }
  console.log('✅ 已从基线加载，补入 ' + imported + ' 条已评指纹到本地 progress');
}

const mode = process.argv[2];
if (mode === '--export') exportBaseline();
else if (mode === '--import') importBaseline();
else {
  console.log('用法: node scripts/validate/review-baseline.mjs --export|--import');
  console.log('  --export  把当前 research/search-reports/*-review/review-progress.json 导出为入库基线');
  console.log('  --import  从基线加载已评指纹到本地 progress（换机器/CI 跳过已评存量）');
}
