import fs from 'fs';
import path from 'path';
import { ensureDir, loadEntityFile, projectRoot, readJson, writeJson } from '../search/common.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const outJsonPath = path.join(reportDir, 'pending-quality.json');
const outMdPath = path.join(reportDir, 'pending-quality.md');
const resolvedPath = path.join(projectRoot, 'scripts/validate/pending-quality-resolved.json');

const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };

const pendingSources = [
  {
    name: '引用质量',
    priority: 'P1',
    file: 'research/search-reports/references-review/pending-fix.json',
    category: 'reference_quality',
    description: 'LLM 引用评审认为需要补强权威来源或替换弱来源的实体。',
  },
  {
    name: '死链与不可达链接',
    priority: 'P1',
    file: 'research/search-reports/dead-links-worklist.json',
    category: 'reference_health',
    description: '链接健康检查发现的死域名、连接错误、超时或鉴权问题。',
  },
  {
    name: '高价值案例缺一手来源',
    priority: 'P1',
    file: 'research/search-reports/highValueMissingPrimary-worklist.json',
    category: 'case_source_quality',
    description: 'criminal_verdict、administrative_enforcement、security_incident、vulnerability_advisory 等高价值案例缺 primary 来源。',
  },
  {
    name: '风险-规避关联',
    priority: 'P2',
    file: 'research/search-reports/risk-avoidance-review/pending-fix.json',
    category: 'relation_quality',
    description: '风险与规避手段覆盖不充分或关联边界待复核。',
  },
  {
    name: '行为者一致性',
    priority: 'P2',
    file: 'research/search-reports/actor-consistency-review/pending-fix.json',
    category: 'relation_quality',
    description: '威胁行为者 build/use 工具、direct/indirect 风险边界待复核。',
  },
  {
    name: '术语完整性',
    priority: 'P2',
    file: 'research/search-reports/term-completeness-review/pending-fix.json',
    category: 'term_quality',
    description: '术语关联风险、规避手段、行为者或业务域覆盖不足。',
  },
  {
    name: '应抽取实体',
    priority: 'P2',
    file: 'research/search-reports/should-extract-review/pending-fix.json',
    category: 'entity_extraction',
    description: '实体描述中包含可独立建模的概念、风险、工具或行为者。',
  },
  {
    name: 'Case 事实核验',
    priority: 'P2',
    file: 'research/search-reports/case-fact-review/pending-fix.json',
    category: 'case_fact_quality',
    description: 'Case summary 与来源页面之间存在未核实、弱支撑或分类边界问题。',
  },
];

function loadArray(file) {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    return { available: false, items: [] };
  }
  const data = readJson(filePath);
  return {
    available: true,
    items: Array.isArray(data) ? data : data.items || data.results || data.cases || [],
    generatedAt: data.generatedAt || '',
  };
}

function loadResolved() {
  if (!fs.existsSync(resolvedPath)) return {};
  return readJson(resolvedPath);
}

function inferEntityType(item) {
  const rawType = item.type || item.entityType || '';
  if (rawType === 'risks' || rawType === 'Risk') return 'risks';
  if (rawType === 'avoidances' || rawType === 'Avoidance') return 'avoidances';
  if (rawType === 'attack-tools' || rawType === 'AttackTool') return 'attack-tools';
  if (rawType === 'threat-actors' || rawType === 'ThreatActor') return 'threat-actors';
  if (rawType === 'terms' || rawType === 'Term') return 'terms';
  if (rawType === 'cases' || rawType === 'Case') return 'cases';

  const key = item.key || item.id || item.entityKey || '';
  if (/^AT\d/.test(key)) return 'attack-tools';
  if (/^TA\d/.test(key)) return 'threat-actors';
  if (/^R\d/.test(key)) return 'risks';
  if (/^A\d/.test(key)) return 'avoidances';
  if (/^T\d/.test(key)) return 'terms';
  if (/^C\d/.test(key)) return 'cases';
  return 'unknown';
}

function entityKey(item) {
  return item.key || item.id || item.entityKey || '';
}

function entityExists(type, key) {
  if (!key || type === 'unknown') return false;
  try {
    return Boolean(loadEntityFile(type, key).entity);
  } catch {
    return false;
  }
}

function normalizeItem(source, item) {
  const key = entityKey(item);
  const type = inferEntityType(item);
  return {
    source: source.name,
    sourceFile: source.file,
    category: source.category,
    priority: source.priority,
    entityType: type,
    entityKey: key,
    entityExists: entityExists(type, key),
    title: item.title || item.entityTitle || '',
    reason: item.reason || item.issue || item.message || '',
    suggestions: item.suggestions || [],
    url: item.url || '',
    domain: item.domain || '',
    status: item.status ?? '',
  };
}

function sortItems(items) {
  return items.sort((a, b) => {
    const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    if (a.entityExists !== b.entityExists) return a.entityExists ? -1 : 1;
    return `${a.source}:${a.entityType}:${a.entityKey}`.localeCompare(`${b.source}:${b.entityType}:${b.entityKey}`);
  });
}

function buildReport() {
  const resolved = loadResolved();
  const sourceReports = [];
  const items = [];
  for (const source of pendingSources) {
    const loaded = loadArray(source.file);
    const resolvedKeys = new Set(resolved[source.file] || []);
    const normalized = loaded.items
      .map((item) => normalizeItem(source, item))
      .map((item) => ({
        ...item,
        resolved: resolvedKeys.has(item.entityKey),
      }));
    sourceReports.push({
      ...source,
      available: loaded.available,
      generatedAt: loaded.generatedAt,
      total: normalized.length,
      currentEntityItems: normalized.filter((item) => item.entityExists && !item.resolved).length,
      resolvedItems: normalized.filter((item) => item.resolved).length,
      staleItems: normalized.filter((item) => !item.entityExists).length,
    });
    items.push(...normalized);
  }
  sortItems(items);

  const byPriority = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byCategory = {};
  const bySource = {};
  for (const item of items.filter((entry) => entry.entityExists && !entry.resolved)) {
    byPriority[item.priority]++;
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    bySource[item.source] = (bySource[item.source] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    note: '本报告只汇总仍指向当前实体的数据治理待办；research 中不可再生缓存、空 pending 和已删除实体对应项不作为当前待办。',
    summary: {
      totalItems: items.length,
      currentEntityItems: items.filter((item) => item.entityExists && !item.resolved).length,
      resolvedItems: items.filter((item) => item.resolved).length,
      staleItems: items.filter((item) => !item.entityExists).length,
      byPriority,
      byCategory,
      bySource,
    },
    sources: sourceReports,
    items,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK 当前质量待办汇总',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    report.note,
    '',
    '## 汇总',
    '',
    `- 当前有效待办: ${report.summary.currentEntityItems}`,
    `- 已吸纳待办: ${report.summary.resolvedItems}`,
    `- 历史残留项: ${report.summary.staleItems}`,
    '',
    '| 优先级 | 数量 |',
    '| --- | ---: |',
  ];
  for (const [priority, count] of Object.entries(report.summary.byPriority)) {
    lines.push(`| ${priority} | ${count} |`);
  }

  lines.push('', '## 来源', '');
  lines.push('| 来源 | 文件 | 状态 | 总数 | 当前有效 | 已吸纳 | 历史残留 |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: |');
  for (const source of report.sources) {
    lines.push(`| ${source.name} | ${source.file} | ${source.available ? 'available' : 'missing'} | ${source.total} | ${source.currentEntityItems} | ${source.resolvedItems} | ${source.staleItems} |`);
  }

  lines.push('', '## 当前有效待办 Top 100', '');
  lines.push('| 优先级 | 来源 | 实体 | 标题 | 原因 |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const item of report.items.filter((entry) => entry.entityExists && !entry.resolved).slice(0, 100)) {
    const reason = String(item.reason || '').replace(/\s+/g, ' ').slice(0, 120);
    lines.push(`| ${item.priority} | ${item.source} | ${item.entityType}/${item.entityKey} | ${item.title || '-'} | ${reason || '-'} |`);
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
ensureDir(reportDir);
writeJson(outJsonPath, report);
fs.writeFileSync(outMdPath, renderMarkdown(report));

console.log('\n=== BREAK 当前质量待办汇总 ===\n');
console.log(`当前有效待办: ${report.summary.currentEntityItems}`);
console.log(`已吸纳待办: ${report.summary.resolvedItems}`);
console.log(`历史残留项: ${report.summary.staleItems}`);
for (const [priority, count] of Object.entries(report.summary.byPriority)) {
  console.log(`${priority}: ${count}`);
}
console.log(`\n报告已保存到: ${outMdPath}`);
