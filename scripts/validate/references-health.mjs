import fs from 'fs';
import path from 'path';
import { domainOf, loadEntities, normalizeLink, projectRoot, writeJson } from '../search/common.mjs';

const entityTypes = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'cases'];
const reportDir = path.join(projectRoot, 'research/search-reports');
const timeoutMs = Number(process.env.REFERENCE_HEALTH_TIMEOUT_MS || 10000);
const concurrency = Number(process.env.REFERENCE_HEALTH_CONCURRENCY || 8);
const strict = process.argv.includes('--strict');

function collectReferences() {
  const byLink = new Map();
  for (const entityType of entityTypes) {
    for (const { key, entity } of loadEntities(entityType)) {
      for (const [refIndex, ref] of (entity.references || []).entries()) {
        const link = normalizeLink(ref.link);
        if (!link) continue;
        if (!byLink.has(link)) {
          byLink.set(link, {
            link,
            domain: domainOf(link),
            references: [],
          });
        }
        byLink.get(link).references.push({
          entityType,
          entityKey: key,
          entityTitle: entity.title || '',
          refIndex,
          refTitle: ref.title || '',
        });
      }
    }
  }
  return [...byLink.values()].sort((a, b) => a.link.localeCompare(b.link));
}

function classifyStatus(status) {
  if (status >= 200 && status < 400) return 'ok';
  if ([401, 403, 405, 429].includes(status)) return 'review';
  if (status >= 400) return 'broken';
  return 'unknown';
}

async function fetchWithTimeout(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'BREAK-reference-health/1.0',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      issue: classifyStatus(response.status),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkLink(item) {
  try {
    let result = await fetchWithTimeout(item.link, 'HEAD');
    if (result.issue === 'broken' || result.status === 405) {
      result = await fetchWithTimeout(item.link, 'GET');
    }
    return {
      ...item,
      ...result,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...item,
      ok: false,
      status: 0,
      finalUrl: '',
      issue: error?.name === 'AbortError' ? 'timeout' : 'connection_error',
      error: error?.message || String(error),
      checkedAt: new Date().toISOString(),
    };
  }
}

async function runPool(items, worker) {
  const results = [];
  let index = 0;
  async function next() {
    while (index < items.length) {
      const current = items[index++];
      results.push(await worker(current));
      if (results.length % 50 === 0) {
        console.log(`已检查 ${results.length}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK 引用链接可达性报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 汇总',
    '',
    '| 指标 | 数量 |',
    '| --- | ---: |',
  ];
  for (const [key, value] of Object.entries(report.stats)) {
    lines.push(`| ${key} | ${value} |`);
  }

  lines.push('', '## 问题链接', '');
  const issueItems = report.results.filter((item) => item.issue !== 'ok');
  if (!issueItems.length) {
    lines.push('未发现不可达或待复核链接。');
  }
  for (const item of issueItems) {
    lines.push(`- [${item.issue}] ${item.status || 'FAILED'} ${item.link}`);
    for (const ref of item.references.slice(0, 5)) {
      lines.push(`  - ${ref.entityType}/${ref.entityKey} ${ref.entityTitle}`);
    }
    if (item.references.length > 5) {
      lines.push(`  - 另有 ${item.references.length - 5} 处引用`);
    }
  }
  return `${lines.join('\n')}\n`;
}

const references = collectReferences();
console.log(`准备检查 ${references.length} 个唯一引用链接，并发 ${concurrency}，超时 ${timeoutMs}ms`);
const results = await runPool(references, checkLink);
const stats = {
  uniqueLinks: results.length,
  ok: results.filter((item) => item.issue === 'ok').length,
  review: results.filter((item) => item.issue === 'review').length,
  broken: results.filter((item) => item.issue === 'broken').length,
  timeout: results.filter((item) => item.issue === 'timeout').length,
  connectionError: results.filter((item) => item.issue === 'connection_error').length,
};

const report = {
  generatedAt: new Date().toISOString(),
  timeoutMs,
  concurrency,
  stats,
  results,
};

fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'reference-health.json'), report);
fs.writeFileSync(path.join(reportDir, 'reference-health.md'), renderMarkdown(report));

console.log('\n=== BREAK 引用链接可达性检查 ===\n');
for (const [key, value] of Object.entries(stats)) {
  console.log(`${key}: ${value}`);
}
console.log(`\n报告已保存到: ${path.join(reportDir, 'reference-health.md')}`);

if (strict && (stats.broken > 0 || stats.timeout > 0 || stats.connectionError > 0)) {
  process.exitCode = 1;
}
