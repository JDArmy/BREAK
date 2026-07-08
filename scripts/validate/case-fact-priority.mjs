import fs from 'fs';
import path from 'path';
import { ensureDir, loadEntityFile, projectRoot, readJson, writeJson } from '../search/common.mjs';
import { highValueCategories } from './source-classify.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const inputPath = path.join(reportDir, 'case-fact-review/pending-fix.json');
const outJsonPath = path.join(reportDir, 'case-fact-priority.json');
const outMdPath = path.join(reportDir, 'case-fact-priority.md');

function loadPending() {
  if (!fs.existsSync(inputPath)) return [];
  const data = readJson(inputPath);
  return Array.isArray(data) ? data : [];
}

function classifyPriority(item, entity) {
  const reason = `${item.reason || ''} ${(item.suggestions || []).join(' ')}`;
  if (!entity) return 'stale';
  if (/无具体事件|未提供.*具体事件|无法核验|无法核实|未提供.*主体|未提供.*时间|补充具体事件来源/.test(reason)) {
    return 'P0';
  }
  if (/与.*矛盾|编造|不一致|错误|删除或弱化|改为|调整为|category/.test(reason)) {
    return 'P1';
  }
  if (highValueCategories.has(entity.category) && /补充|primary|一手|判决|通报|官方/.test(reason)) {
    return 'P1';
  }
  if (/抓取|403|超时|无法访问|连接|网页内容未/.test(reason)) {
    return 'P2';
  }
  return 'P2';
}

function buildReport() {
  const pending = loadPending();
  const items = pending.map((item) => {
    const key = item.key || item.id || '';
    const { entity, filePath } = key ? loadEntityFile('cases', key) : { entity: null, filePath: '' };
    const priority = classifyPriority(item, entity);
    return {
      priority,
      key,
      title: item.title || entity?.title || '',
      category: entity?.category || '',
      incidentTime: entity?.incidentTime || '',
      file: filePath ? path.relative(projectRoot, filePath) : '',
      exists: Boolean(entity),
      reason: item.reason || '',
      suggestions: item.suggestions || [],
    };
  }).sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2, stale: 3 };
    const delta = rank[a.priority] - rank[b.priority];
    if (delta !== 0) return delta;
    return a.key.localeCompare(b.key);
  });

  const byPriority = { P0: 0, P1: 0, P2: 0, stale: 0 };
  const byCategory = {};
  for (const item of items) {
    byPriority[item.priority]++;
    if (item.exists) byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    input: path.relative(projectRoot, inputPath),
    priorityPolicy: {
      P0: '来源不足以支撑具体事件、主体或时间，优先改分类、弱化 summary 或删除。',
      P1: 'summary 与来源存在疑似事实不一致，或高价值案例缺官方/一手来源。',
      P2: '抓取失败、来源可达性或一般补强问题，可批量复测后处理。',
      stale: '清单指向的 Case 当前不存在。',
    },
    summary: {
      total: items.length,
      current: items.filter((item) => item.exists).length,
      stale: items.filter((item) => !item.exists).length,
      byPriority,
      byCategory,
    },
    items,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK Case 事实核验优先级',
    '',
    `生成时间: ${report.generatedAt}`,
    `输入: ${report.input}`,
    '',
    '## 分级规则',
    '',
  ];
  for (const [priority, text] of Object.entries(report.priorityPolicy)) {
    lines.push(`- ${priority}: ${text}`);
  }

  lines.push('', '## 汇总', '');
  lines.push('| 优先级 | 数量 |');
  lines.push('| --- | ---: |');
  for (const [priority, count] of Object.entries(report.summary.byPriority)) {
    lines.push(`| ${priority} | ${count} |`);
  }

  lines.push('', '## P0/P1 待处理样例', '');
  lines.push('| 优先级 | Case | 类别 | 标题 | 原因 |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const item of report.items.filter((entry) => ['P0', 'P1'].includes(entry.priority)).slice(0, 120)) {
    const reason = String(item.reason || '').replace(/\s+/g, ' ').slice(0, 140);
    lines.push(`| ${item.priority} | ${item.key} | ${item.category || '-'} | ${item.title || '-'} | ${reason || '-'} |`);
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
ensureDir(reportDir);
writeJson(outJsonPath, report);
fs.writeFileSync(outMdPath, renderMarkdown(report));

console.log('\n=== BREAK Case 事实核验优先级 ===\n');
for (const [priority, count] of Object.entries(report.summary.byPriority)) {
  console.log(`${priority}: ${count}`);
}
console.log(`当前有效: ${report.summary.current}`);
console.log(`报告已保存到: ${outMdPath}`);
