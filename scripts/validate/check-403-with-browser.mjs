import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const inputPath = path.join(projectRoot, process.argv.find((arg) => arg.startsWith('--input='))?.slice('--input='.length) || 'research/search-reports/reference-health-filtered.json');
const outputJsonPath = path.join(reportDir, 'reference-browser-check.json');
const outputMarkdownPath = path.join(reportDir, 'reference-browser-check.md');
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) || 0);
const issueFilter = process.argv.find((arg) => arg.startsWith('--issue='))?.slice('--issue='.length) || '';

function loadIssueItems() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`缺少输入报告: ${path.relative(projectRoot, inputPath)}`);
  }
  const report = readJson(inputPath);
  let items = (report.results || []).filter((item) => item.issue && item.issue !== 'ok');
  if (issueFilter) {
    items = items.filter((item) => item.issue === issueFilter);
  }
  return limit > 0 ? items.slice(0, limit) : items;
}

async function checkUrl(page, url) {
  const result = {
    url,
    browserOk: false,
    status: 0,
    title: '',
    finalUrl: '',
    bodySample: '',
    error: '',
  };

  try {
    const response = await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
    result.status = response?.status() || 0;
    result.finalUrl = page.url();
    result.title = (await page.title().catch(() => '')).slice(0, 160);
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    result.bodySample = bodyText.replace(/\s+/g, ' ').trim().slice(0, 240);
    result.browserOk = result.status >= 200 && result.status < 400;
  } catch (error) {
    result.error = error?.message || String(error);
    result.browserOk = /Download is starting/i.test(result.error);
    if (result.browserOk) {
      result.status = 200;
      result.bodySample = '浏览器触发下载，视为浏览器可访问。';
    }
  }

  return result;
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK 引用浏览器复核报告',
    '',
    `生成时间: ${report.generatedAt}`,
    `输入报告: ${report.input}`,
    '',
    '## 汇总',
    '',
    '| 指标 | 数量 |',
    '| --- | ---: |',
    `| total | ${report.summary.total} |`,
    `| browserOk | ${report.summary.browserOk} |`,
    `| browserReview | ${report.summary.browserReview} |`,
    '',
    '## 明细',
    '',
  ];

  for (const item of report.results) {
    lines.push(`- [${item.browserOk ? 'browser-ok' : 'browser-review'}] ${item.status || 'FAILED'} ${item.url}`);
    if (item.title) lines.push(`  - title: ${item.title}`);
    if (item.error) lines.push(`  - error: ${item.error}`);
    const ref = item.references?.[0];
    if (ref) lines.push(`  - ref: ${ref.entityType}/${ref.entityKey} ${ref.entityTitle}`);
  }

  return `${lines.join('\n')}\n`;
}

const items = loadIssueItems();
console.log(`准备使用 Chromium 复核 ${items.length} 个链接`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
});
const page = await context.newPage();
page.setDefaultNavigationTimeout(30000);

const results = [];
for (const [index, item] of items.entries()) {
  console.log(`[${index + 1}/${items.length}] ${item.link}`);
  const browserResult = await checkUrl(page, item.link);
  results.push({
    ...item,
    ...browserResult,
  });
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  input: path.relative(projectRoot, inputPath),
  summary: {
    total: results.length,
    browserOk: results.filter((item) => item.browserOk).length,
    browserReview: results.filter((item) => !item.browserOk).length,
  },
  results,
};

writeJson(outputJsonPath, report);
fs.writeFileSync(outputMarkdownPath, renderMarkdown(report));

console.log('\n✅ 浏览器复核完成');
console.log(`browserOk=${report.summary.browserOk}`);
console.log(`browserReview=${report.summary.browserReview}`);
console.log(`report=${path.relative(projectRoot, outputMarkdownPath)}`);
