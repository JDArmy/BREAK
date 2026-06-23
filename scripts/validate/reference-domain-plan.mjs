import fs from 'fs';
import path from 'path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const referenceHealthPath = path.join(reportDir, 'reference-health.json');
const outputJsonPath = path.join(reportDir, 'reference-domain-plan.json');
const outputMarkdownPath = path.join(reportDir, 'reference-domain-plan.md');

const priorityOrder = { P0: 0, P1: 1, P2: 2 };
const actionCommands = {
  retry_with_long_timeout_preserve:
    'REFERENCE_HEALTH_TIMEOUT_MS=30000 REFERENCE_HEALTH_CONCURRENCY=4 npm run audit:references-health -- --domains={domain}',
  manual_review_preserve:
    'npm run audit:references-health:cached -- --domains={domain} && npm run audit:references-browser -- --issue=review',
  replace_or_add_primary:
    'npm run audit:quality-report',
  browser_review_preserve:
    'npm run audit:references-health:cached -- --domains={domain} && npm run audit:references-browser -- --issue=connection_error --ignore-https-errors',
  manual_review_or_replace:
    'npm run audit:references-health:cached -- --domains={domain} && npm run audit:references-browser -- --issue=review',
  retry_or_replace:
    'REFERENCE_HEALTH_TIMEOUT_MS=30000 REFERENCE_HEALTH_CONCURRENCY=4 npm run audit:references-health -- --domains={domain}',
  replace_or_remove:
    'npm run audit:references-health:cached -- --domains={domain}',
  manual_review:
    'npm run audit:references-health:cached -- --domains={domain} && npm run audit:references-browser -- --issue=review',
};

function readReferenceHealthReport() {
  if (!fs.existsSync(referenceHealthPath)) {
    throw new Error(`缺少引用健康报告: ${path.relative(projectRoot, referenceHealthPath)}`);
  }
  return readJson(referenceHealthPath);
}

function buildTasks(report) {
  return (report.domainGroups || [])
    .map((group) => {
      const action = group.strategy?.action || 'manual_review';
      const priority = group.strategy?.priority || 'P2';
      return {
        domain: group.domain,
        priority,
        action,
        total: group.total,
        issues: group.issues || {},
        statuses: group.statuses || {},
        entityTypes: group.entityTypes || {},
        referenceCount: group.referenceCount || 0,
        command: (actionCommands[action] || actionCommands.manual_review).replace('{domain}', group.domain),
        note: group.strategy?.note || '',
        examples: group.examples || [],
      };
    })
    .sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99) ||
        b.total - a.total ||
        a.domain.localeCompare(b.domain),
    );
}

function summarizeTasks(tasks) {
  const byPriority = {};
  const byAction = {};
  for (const task of tasks) {
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    byAction[task.action] = (byAction[task.action] || 0) + 1;
  }
  return {
    totalDomains: tasks.length,
    affectedLinks: tasks.reduce((sum, task) => sum + task.total, 0),
    affectedReferences: tasks.reduce((sum, task) => sum + task.referenceCount, 0),
    byPriority,
    byAction,
  };
}

function renderMarkdown(plan) {
  const lines = [
    '# BREAK 引用域名治理计划',
    '',
    `生成时间: ${plan.generatedAt}`,
    `来源报告时间: ${plan.sourceReportGeneratedAt}`,
    '',
    '## 汇总',
    '',
    '| 指标 | 数量 |',
    '| --- | ---: |',
    `| totalDomains | ${plan.summary.totalDomains} |`,
    `| affectedLinks | ${plan.summary.affectedLinks} |`,
    `| affectedReferences | ${plan.summary.affectedReferences} |`,
    '',
    '### 按优先级',
    '',
    '| priority | domains |',
    '| --- | ---: |',
  ];

  for (const [priority, count] of Object.entries(plan.summary.byPriority)) {
    lines.push(`| ${priority} | ${count} |`);
  }

  lines.push('', '### 按处理动作', '', '| action | domains |', '| --- | ---: |');
  for (const [action, count] of Object.entries(plan.summary.byAction)) {
    lines.push(`| ${action} | ${count} |`);
  }

  lines.push('', '## P1 域名批次', '');
  lines.push('| domain | links | refs | action | command |');
  lines.push('| --- | ---: | ---: | --- | --- |');
  for (const task of plan.tasks.filter((item) => item.priority === 'P1')) {
    lines.push(`| ${task.domain} | ${task.total} | ${task.referenceCount} | ${task.action} | \`${task.command}\` |`);
  }

  lines.push('', '## 全量任务', '');
  for (const task of plan.tasks) {
    const issues = Object.entries(task.issues).map(([key, value]) => `${key}:${value}`).join(', ');
    const statuses = Object.entries(task.statuses).map(([key, value]) => `${key}:${value}`).join(', ');
    lines.push(`- **${task.priority} ${task.domain}** (${task.action})`);
    lines.push(`  - links=${task.total}, refs=${task.referenceCount}, issues=${issues}, statuses=${statuses}`);
    lines.push(`  - ${task.note}`);
    lines.push(`  - command: \`${task.command}\``);
  }

  return `${lines.join('\n')}\n`;
}

const sourceReport = readReferenceHealthReport();
const tasks = buildTasks(sourceReport);
const plan = {
  generatedAt: new Date().toISOString(),
  sourceReportGeneratedAt: sourceReport.generatedAt || '',
  summary: summarizeTasks(tasks),
  tasks,
};

writeJson(outputJsonPath, plan);
fs.writeFileSync(outputMarkdownPath, renderMarkdown(plan));

console.log('\n✅ 引用域名治理计划已生成');
console.log(`domains=${plan.summary.totalDomains}`);
console.log(`affectedLinks=${plan.summary.affectedLinks}`);
console.log(`affectedReferences=${plan.summary.affectedReferences}`);
console.log(`report=${path.relative(projectRoot, outputMarkdownPath)}`);
