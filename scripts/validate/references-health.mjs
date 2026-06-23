import fs from 'fs';
import path from 'path';
import { domainOf, loadEntities, normalizeLink, projectRoot, writeJson } from '../search/common.mjs';

const entityTypes = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'cases'];
const reportDir = path.join(projectRoot, 'research/search-reports');
const timeoutMs = Number(process.env.REFERENCE_HEALTH_TIMEOUT_MS || 10000);
const concurrency = Number(process.env.REFERENCE_HEALTH_CONCURRENCY || 8);
const strict = process.argv.includes('--strict');
const fromCache = process.argv.includes('--from-cache');
const maxDomainExamples = 5;

const officialDomainSuffixes = [
  '.gov',
  '.gov.cn',
  'court.gov.cn',
  'chinacourt.org',
  'mps.gov.cn',
  'cisa.gov',
  'fbi.gov',
  'justice.gov',
  'nist.gov',
  'nvd.nist.gov',
  'cve.org',
  'mitre.org',
  'attack.mitre.org',
  'microsoft.com',
];

const academicDomainSuffixes = [
  '.edu',
  '.edu.cn',
  'dl.acm.org',
  'doi.org',
  'ieee.org',
  'arxiv.org',
  'sciencedirect.com',
  'springer.com',
  'usenix.org',
];

const socialOrMirrorDomainSuffixes = [
  'mp.weixin.qq.com',
  'reddit.com',
  'linkedin.com',
  'facebook.com',
  'telegram.org',
  'toutiao.com',
  'meipian.cn',
];

function matchesDomain(domain, suffixes) {
  return suffixes.some((suffix) => {
    if (suffix.startsWith('.')) return domain.endsWith(suffix);
    return domain === suffix || domain.endsWith(`.${suffix}`);
  });
}

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
  if ([401, 403, 405, 412, 429, 521].includes(status)) return 'review';
  if (status >= 400) return 'broken';
  return 'unknown';
}

function classifyDomainStrategy(domain, issues, statuses) {
  const issueKeys = Object.keys(issues);
  const statusKeys = Object.keys(statuses);
  const isOfficial = matchesDomain(domain, officialDomainSuffixes);
  const isAcademic = matchesDomain(domain, academicDomainSuffixes);
  const isSocialOrMirror = matchesDomain(domain, socialOrMirrorDomainSuffixes);

  if (issues.broken) {
    return {
      action: 'replace_or_remove',
      priority: 'P0',
      note: '存在明确 broken 链接，优先替换为可访问 primary source 或删除失效引用。',
    };
  }

  if (issues.timeout && issueKeys.length === 1) {
    return {
      action: isOfficial || isAcademic ? 'retry_with_long_timeout_preserve' : 'retry_or_replace',
      priority: isOfficial || isAcademic ? 'P1' : 'P2',
      note: isOfficial || isAcademic
        ? '权威/学术来源超时，优先用更长超时复测；仍失败时保留并补充镜像或替代来源。'
        : '普通来源超时，复测后仍失败则替换为更稳定来源。',
    };
  }

  if (statusKeys.includes('403') || statusKeys.includes('401') || statusKeys.includes('429')) {
    return {
      action: isOfficial || isAcademic ? 'manual_review_preserve' : 'manual_review_or_replace',
      priority: isOfficial || isAcademic ? 'P1' : 'P2',
      note: isOfficial || isAcademic
        ? '权限/反爬导致的待复核，来源价值较高时不直接删除，人工确认页面可访问性。'
        : '权限/反爬导致的待复核，人工确认后决定保留、替换或补充镜像。',
    };
  }

  if (isSocialOrMirror || issues.connection_error) {
    return {
      action: 'replace_or_add_primary',
      priority: isSocialOrMirror ? 'P1' : 'P2',
      note: isSocialOrMirror
        ? '社交/转载入口稳定性较弱，优先替换或补充官方、法院、厂商、论文等 primary source。'
        : '连接错误需复测；如长期失败，替换为更稳定来源。',
    };
  }

  return {
    action: 'manual_review',
    priority: 'P2',
    note: '待人工复核域名策略。',
  };
}

function buildDomainGroups(results) {
  const groups = new Map();
  for (const item of results.filter((result) => result.issue !== 'ok')) {
    const domain = item.domain || 'unknown';
    if (!groups.has(domain)) {
      groups.set(domain, {
        domain,
        total: 0,
        issues: {},
        statuses: {},
        entityTypes: {},
        referenceCount: 0,
        examples: [],
      });
    }
    const group = groups.get(domain);
    group.total++;
    group.issues[item.issue] = (group.issues[item.issue] || 0) + 1;
    group.statuses[item.status || 0] = (group.statuses[item.status || 0] || 0) + 1;
    group.referenceCount += item.references?.length || 0;
    for (const ref of item.references || []) {
      group.entityTypes[ref.entityType] = (group.entityTypes[ref.entityType] || 0) + 1;
    }
    if (group.examples.length < maxDomainExamples) {
      group.examples.push({
        issue: item.issue,
        status: item.status || 0,
        link: item.link,
        references: (item.references || []).slice(0, 3),
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      strategy: classifyDomainStrategy(group.domain, group.issues, group.statuses),
    }))
    .sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2 };
      return (
        (priorityOrder[a.strategy.priority] ?? 99) - (priorityOrder[b.strategy.priority] ?? 99) ||
        b.total - a.total ||
        a.domain.localeCompare(b.domain)
      );
    });
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

  lines.push('', '## 域名级复核策略', '');
  const domainGroups = report.domainGroups || [];
  if (!domainGroups.length) {
    lines.push('未发现需要按域名复核的链接。');
  } else {
    lines.push('| domain | total | issues | statuses | entityTypes | priority | action |');
    lines.push('| --- | ---: | --- | --- | --- | --- | --- |');
    for (const group of domainGroups) {
      const issues = Object.entries(group.issues).map(([key, value]) => `${key}:${value}`).join(', ');
      const statuses = Object.entries(group.statuses).map(([key, value]) => `${key}:${value}`).join(', ');
      const entityTypes = Object.entries(group.entityTypes).map(([key, value]) => `${key}:${value}`).join(', ');
      lines.push(
        `| ${group.domain} | ${group.total} | ${issues} | ${statuses} | ${entityTypes} | ${group.strategy.priority} | ${group.strategy.action} |`,
      );
    }
  }

  lines.push('', '## 域名策略说明', '');
  for (const group of domainGroups.slice(0, 30)) {
    lines.push(`- **${group.domain}** (${group.strategy.priority}/${group.strategy.action}): ${group.strategy.note}`);
    for (const example of group.examples.slice(0, 2)) {
      const ref = example.references?.[0];
      lines.push(`  - [${example.issue}] ${example.status || 'FAILED'} ${example.link}`);
      if (ref) {
        lines.push(`    - ${ref.entityType}/${ref.entityKey} ${ref.entityTitle}`);
      }
    }
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

let results;
let cachedReport = null;
if (fromCache) {
  const cachePath = path.join(reportDir, 'reference-health.json');
  if (!fs.existsSync(cachePath)) {
    console.error(`缺少缓存报告: ${cachePath}`);
    process.exit(1);
  }
  cachedReport = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  results = cachedReport.results || [];
  console.log(`使用缓存引用健康报告重新生成域名分组: ${cachePath}`);
} else {
  const references = collectReferences();
  console.log(`准备检查 ${references.length} 个唯一引用链接，并发 ${concurrency}，超时 ${timeoutMs}ms`);
  results = await runPool(references, checkLink);
}
const stats = {
  uniqueLinks: results.length,
  ok: results.filter((item) => item.issue === 'ok').length,
  review: results.filter((item) => item.issue === 'review').length,
  broken: results.filter((item) => item.issue === 'broken').length,
  timeout: results.filter((item) => item.issue === 'timeout').length,
  connectionError: results.filter((item) => item.issue === 'connection_error').length,
};

const report = {
  generatedAt: fromCache ? cachedReport.generatedAt : new Date().toISOString(),
  timeoutMs: fromCache ? cachedReport.timeoutMs : timeoutMs,
  concurrency: fromCache ? cachedReport.concurrency : concurrency,
  stats,
  domainGroups: buildDomainGroups(results),
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
