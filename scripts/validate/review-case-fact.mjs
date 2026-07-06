// C 类 LLM + 抓取：Case 事实核验（Scrapingdog 抓 references 网页正文 → LLM 比对 summary）
// 规则：
//   case_summary_fact_check — summary 与抓取事实交叉核验
//   case_existence_check   — 抓取失败/404 → 来源可疑
// 抓取缓存到 research/search-reports/case-fact-review/scraped/ 避免重抓

import fs from 'fs';
import path from 'path';
import { projectRoot, ensureDir, writeJson } from '../search/common.mjs';
import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';
import { chatJson, withRetry, sleep } from '../llm/llm-client.mjs';
import { fingerprintOf } from '../llm/llm-review-runner.mjs';
import { classifySource, highValueCategories } from './source-classify.mjs';

const opts = parseArgs(process.argv.slice(2));
const OUT_DIR = path.join(projectRoot, 'research/search-reports/case-fact-review');
const SCRAPED_DIR = path.join(OUT_DIR, 'scraped');
const REPORT_PATH = path.join(OUT_DIR, 'review-report.json');
const PROGRESS_PATH = path.join(OUT_DIR, 'review-progress.json');
const MD_PATH = path.join(OUT_DIR, 'review-report.md');
const PENDING_PATH = path.join(OUT_DIR, 'pending-fix.json');
ensureDir(SCRAPED_DIR);

const SCRAPINGDOG_KEY = process.env.SCRAPINGDOG_API_KEY;

// 收集待审 Case
let items;
if (opts.full) {
  items = loadAllEntities('cases').map((r) => ({ key: r.key, type: 'cases', entity: r.entity }));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
  items = changed
    .filter((c) => c.type === 'cases' && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: 'cases', entity: c.entity }));
}
if (opts.type && opts.type !== 'cases') items = [];
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

// Scrapingdog 抓取网页正文（通用 scrape 端点）
async function scrapeUrl(url) {
  if (!SCRAPINGDOG_KEY) {
    return { ok: false, reason: 'SCRAPINGDOG_API_KEY 未配置', content: '' };
  }
  try {
    const apiUrl = new URL('https://api.scrapingdog.com/scrape');
    apiUrl.searchParams.set('api_key', SCRAPINGDOG_KEY);
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('dynamic', 'false');
    const res = await fetch(apiUrl.toString(), { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status}`, content: '' };
    }
    const html = await res.text();
    // 简易 HTML→文本：去标签、去脚本、合并空白
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    return { ok: true, reason: '', content: text.slice(0, 4000) };
  } catch (e) {
    return { ok: false, reason: String(e.message || e).slice(0, 100), content: '' };
  }
}

function cachePath(caseKey, refIndex) {
  return path.join(SCRAPED_DIR, `${caseKey}-${refIndex}.txt`);
}

async function getScrapedContent(caseKey, ref, refIndex) {
  // 用调用方传入的真实 refIndex 作缓存 key，避免第二条 reference 复用第一条的缓存
  // （此前 refIndex 硬编码 0 导致多源核验退化为单源）。
  const cp = cachePath(caseKey, refIndex);
  if (fs.existsSync(cp)) {
    return { content: fs.readFileSync(cp, 'utf8'), fromCache: true };
  }
  const r = await scrapeUrl(ref.link);
  if (r.ok) {
    fs.writeFileSync(cp, r.content);
  }
  return { content: r.content, reason: r.reason, ok: r.ok };
}

function buildPrompt(item, scrapedContents) {
  const { entity } = item;
  const sys = `你是 BREAK 知识库的案例事实核验员。根据抓取的 references 网页内容，核验 Case summary 的事实正确性。
严格规则：
1. 只输出 JSON 对象。
2. 区分 Case 类型核验严格度：
   - 事件性 Case（criminal_verdict/administrative_enforcement/security_incident）：summary 须有具体事件要素（时间/主体/结果），与网页事实逐一对应，矛盾或编造才 fail。
   - 原理/示例性 Case（academic_research/news_report）：summary 是攻击原理或技术说明，references 是科普/学术资料，不必每个细节逐一对应；只要网页内容与 summary 主题一致、无矛盾事实，即 pass。fabrications 仅指 summary 编造了与网页矛盾的事实（而非网页未提及的细节）。
3. extractedFacts：从网页内容提取关键事实 {incidentTime, actors, method, outcome}（提取不到则留空）。
4. summaryVsFact：
   - verdict: 'accurate'(一致/无矛盾) / 'partial'(细节出入但无矛盾) / 'contradicted'(矛盾) / 'fabricated'(summary 编造网页矛盾的事实)
   - conflicts: 矛盾点数组
   - fabrications: summary 与网页矛盾的关键事实（注意：网页未提及 ≠ 编造，仅网页明确反驳才算）
5. verdict：pass(accurate)/review(partial)/fail(contradicted/fabricated)。
6. reason: 一句话。suggestions: 数组。`;
  const factsText = scrapedContents
    .map((s, i) => `【源${i}】${s.ok ? s.content.slice(0, 1500) : `(抓取失败: ${s.reason})`}`)
    .join('\n\n');
  const user = `【案例】${item.key} ${entity.title}
【category】${entity.category}
【incidentTime】${entity.incidentTime || ''}
【summary】${entity.summary || ''}

【抓取的 references 网页内容】
${factsText || '（无可用内容）'}

请核验 summary 事实正确性，输出 JSON。`;
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

function validateResult(data) {
  if (!data || typeof data !== 'object') throw new Error('返回非对象');
  if (!['pass', 'review', 'fail'].includes(data.verdict)) throw new Error(`verdict 非法: ${data.verdict}`);
  if (typeof data.reason !== 'string' || !data.reason.trim()) throw new Error('reason 必须非空');
  if (!Array.isArray(data.suggestions)) throw new Error('suggestions 必须是数组');
  if (!data.summaryVsFact || typeof data.summaryVsFact !== 'object') data.summaryVsFact = { verdict: 'partial', conflicts: [], fabrications: [] };
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    } catch {}
  }
  // 本地 progress 不存在时，从入库基线加载
  const baselinePath = path.join(projectRoot, 'scripts/validate/review-progress-baseline.json');
  if (fs.existsSync(baselinePath)) {
    try {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      if (baseline['case-fact']) {
        return { done: baseline['case-fact'].done || {}, failed: baseline['case-fact'].failed || {} };
      }
    } catch {}
  }
  return { done: {}, failed: {} };
}

const progress = loadProgress();
let results = [];
if (fs.existsSync(REPORT_PATH)) {
  try {
    results = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  } catch {}
}
const resultById = new Map(results.map((r) => [r.key, r]));

console.log(`[case-fact] 共 ${items.length} 项，待评审 ${items.filter((it) => !progress.done[it.key]).length}`);

let done = 0;
let failed = 0;
const startMs = Date.now();

async function reviewOne(item) {
  const refs = Array.isArray(item.entity.references) ? item.entity.references : [];
  if (!refs.length) {
    return {
      key: item.key,
      type: 'cases',
      title: item.entity.title,
      verdict: 'review',
      reason: '无 references，无法核验事实',
      suggestions: [],
      summaryVsFact: { verdict: 'partial', conflicts: [], fabrications: [] },
      reviewedAt: new Date().toISOString(),
    };
  }
  // 抓取前 2 条 reference（控制成本）
  const scrapedContents = [];
  for (let i = 0; i < Math.min(2, refs.length); i++) {
    const s = await getScrapedContent(item.key, refs[i], i);
    scrapedContents.push({ ...s, ok: s.ok || !!s.content });
  }
  const allFailed = scrapedContents.every((s) => !s.ok && !s.content);
  const isHighValue = highValueCategories.has(item.entity.category);

  const data = await withRetry(async () => {
    const d = await chatJson(buildPrompt(item, scrapedContents), { model: 'multi', timeoutMs: 90000 });
    validateResult(d);
    return d;
  }, { retries: 3 });

  // 抓取全失败：降为 review（无法核验不等于造假，可能是反爬/动态页面，需人工确认）
  // 原逻辑升 fail 会误判 aws/baidu 等反爬站点的合理 Case
  if (allFailed) {
    if (data.verdict === 'pass') {
      data.verdict = 'review';
      data.reason = `references 全部抓取失败（${data.reason}），无法核验事实，需人工确认来源可达性`;
    }
  }
  return {
    key: item.key,
    type: 'cases',
    title: item.entity.title,
    ...data,
    scrapedOk: scrapedContents.map((s) => s.ok),
    reviewedAt: new Date().toISOString(),
  };
}

let idx = 0;
async function worker() {
  while (idx < items.length) {
    const item = items[idx++];
    const fp = fingerprintOf(item.entity, ['summary', 'references', 'incidentTime']);
    if (progress.done[item.key] === fp) {
      continue;
    }
    try {
      const r = await reviewOne(item);
      resultById.set(item.key, r);
      progress.done[item.key] = fp;
      done++;
      if (done % 5 === 0) {
        writeJson(REPORT_PATH, [...resultById.values()]);
        writeJson(PROGRESS_PATH, progress);
        console.log(`  [case-fact] 进度 ${done}/${items.length}，${((Date.now() - startMs) / 1000).toFixed(0)}s`);
      }
    } catch (e) {
      failed++;
      progress.failed[item.key] = String(e.message || e).slice(0, 500);
      console.warn(`  [case-fact] ✗ ${item.key}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker())); // 并发 4 提速（429 由 withRetry 处理）

const all = [...resultById.values()];
writeJson(REPORT_PATH, all);
writeJson(PROGRESS_PATH, progress);
writeJson(PENDING_PATH, all.filter((r) => r.verdict === 'fail' || r.verdict === 'review').map((r) => ({ key: r.key, title: r.title, verdict: r.verdict, reason: r.reason, suggestions: r.suggestions || [] })));

// markdown 报告
const lines = ['# Case 事实核验 LLM 评审报告', '', `生成时间：${new Date().toISOString()}`, `总计：${all.length}`, ''];
const byV = { pass: [], review: [], fail: [] };
for (const r of all) (byV[r.verdict] || (byV[r.verdict] = [])).push(r);
lines.push(`- ✅ pass: ${byV.pass.length}`, `- 🔍 review: ${byV.review.length}`, `- ❌ fail: ${byV.fail.length}`, '');
for (const v of ['fail', 'review']) {
  if (!byV[v].length) continue;
  lines.push(`## ${v === 'fail' ? '❌ fail' : '🔍 review'} 清单（${byV[v].length}）`, '');
  for (const r of byV[v]) {
    lines.push(`### ${r.key} — ${r.title}`, `- verdict: ${r.verdict}`, `- reason: ${r.reason}`);
    if (r.summaryVsFact?.verdict) lines.push(`- summaryVsFact: ${r.summaryVsFact.verdict}`);
    if (r.summaryVsFact?.conflicts?.length) lines.push(`- conflicts: ${r.summaryVsFact.conflicts.join('; ')}`);
    if (r.suggestions?.length) lines.push('- suggestions:', ...r.suggestions.map((s) => `  - ${s}`));
    lines.push('');
  }
}
fs.writeFileSync(MD_PATH, lines.join('\n'));

const pass = byV.pass.length, review = byV.review.length, fail = byV.fail.length;
console.log(`[case-fact] ✅ pass: ${pass}　🔍 review: ${review}　❌ fail: ${fail}（失败 ${failed}）`);
process.exit(fail > 0 ? 1 : 0);
