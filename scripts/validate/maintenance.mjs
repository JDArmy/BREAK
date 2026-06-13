import fs from 'fs';
import path from 'path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const reportJsonPath = path.join(reportDir, 'maintenance-summary.json');
const reportMdPath = path.join(reportDir, 'maintenance-summary.md');

const sourceFiles = {
  references: 'reference-baseline.json',
  relations: 'relationship-coverage.json',
  metrics: 'metrics-baseline.json',
  bundle: 'bundle-budget.json',
};

const priorityRank = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function relativeReportPath(fileName) {
  return path.join('research/search-reports', fileName);
}

function loadReport(name, fileName) {
  const filePath = path.join(reportDir, fileName);
  if (!fs.existsSync(filePath)) {
    return {
      name,
      file: relativeReportPath(fileName),
      available: false,
      error: 'report_missing',
    };
  }

  const report = readJson(filePath);
  return {
    name,
    file: relativeReportPath(fileName),
    available: true,
    generatedAt: report.generatedAt || '',
    report,
  };
}

function priorityForReferenceSeverity(severity) {
  if (severity === 'error') return 'P0';
  if (severity === 'review') return 'P1';
  return 'P2';
}

function priorityForRelationSeverity(severity) {
  if (severity === 'error') return 'P0';
  if (severity === 'review') return 'P1';
  return 'P3';
}

function addTask(tasks, task) {
  tasks.push({
    priority: task.priority,
    source: task.source,
    type: task.type,
    title: task.title,
    count: task.count ?? 1,
    details: task.details || [],
  });
}

function groupByType(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.type || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function addMissingReportTasks(tasks, sources) {
  for (const source of sources) {
    if (!source.available) {
      addTask(tasks, {
        priority: 'P0',
        source: source.name,
        type: 'missing_report',
        title: `缺少 ${source.file}，请先运行对应 audit 脚本`,
      });
    }
  }
}

function addReferenceTasks(tasks, source) {
  if (!source.available) return;

  const issues = source.report.issues || [];
  for (const [type, items] of groupByType(issues)) {
    const priority = items.reduce((current, item) => {
      const next = priorityForReferenceSeverity(item.severity);
      return priorityRank[next] < priorityRank[current] ? next : current;
    }, 'P3');
    addTask(tasks, {
      priority,
      source: source.name,
      type,
      title: `参考资料问题: ${type}`,
      count: items.length,
      details: items.slice(0, 10).map((item) => ({
        entityType: item.entityType,
        entityKey: item.entityKey,
        title: item.entityTitle,
        severity: item.severity,
      })),
    });
  }

  for (const item of source.report.stats || []) {
    if (item.coverageRate < 100) {
      addTask(tasks, {
        priority: 'P1',
        source: source.name,
        type: 'reference_coverage',
        title: `${item.type} 存在 ${item.missingReferences} 个实体缺少参考资料`,
        count: item.missingReferences,
      });
    }
    if (item.lowQualityRate > 0) {
      addTask(tasks, {
        priority: 'P2',
        source: source.name,
        type: 'low_quality_reference_rate',
        title: `${item.type} 低质量来源占比 ${item.lowQualityRate}%`,
        count: item.lowQuality,
      });
    }
  }
}

function addRelationTasks(tasks, source) {
  if (!source.available) return;

  const issues = source.report.issues || [];
  for (const [type, items] of groupByType(issues)) {
    const priority = items.reduce((current, item) => {
      const next = priorityForRelationSeverity(item.severity);
      return priorityRank[next] < priorityRank[current] ? next : current;
    }, 'P3');
    addTask(tasks, {
      priority,
      source: source.name,
      type,
      title: `关系覆盖问题: ${type}`,
      count: items.length,
      details: items.slice(0, 10).map((item) => ({
        key: item.key || item.ref,
        title: item.title,
        severity: item.severity,
        message: item.message,
      })),
    });
  }

  const review = source.report.review || {};
  const reviewGroups = [
    ['unreferencedAvoidances', '未被 Risk/AttackTool 引用的 Avoidance'],
    ['unreferencedMainRisks', '未被场景/工具/行为者引用的主 Risk'],
    ['attackToolsWithoutThreatActors', '未被 ThreatActor 引用的 AttackTool'],
  ];
  for (const [key, title] of reviewGroups) {
    const items = review[key] || [];
    if (items.length > 0) {
      addTask(tasks, {
        priority: key === 'attackToolsWithoutThreatActors' ? 'P3' : 'P1',
        source: source.name,
        type: key,
        title,
        count: items.length,
        details: items.slice(0, 10),
      });
    }
  }
}

function addMetricsTasks(tasks, source) {
  if (!source.available) return;

  for (const item of source.report.maintenanceTasks || []) {
    addTask(tasks, {
      priority: item.priority,
      source: source.name,
      type: item.type,
      title: item.title,
      count: item.count,
    });
  }

  for (const item of source.report.sceneIssues || []) {
    addTask(tasks, {
      priority: item.severity === 'error' ? 'P0' : 'P2',
      source: source.name,
      type: item.type,
      title: item.message,
      count: item.count || 1,
    });
  }
}

function addBundleTasks(tasks, source) {
  if (!source.available) return;

  for (const issue of source.report.issues || []) {
    addTask(tasks, {
      priority: 'P1',
      source: source.name,
      type: issue.type,
      title: issue.message,
      count: 1,
      details: [
        {
          file: issue.file,
          kb: issue.kb,
          budgetKb: issue.budgetKb,
        },
      ],
    });
  }
}

function summarizeTasks(tasks) {
  const byPriority = Object.fromEntries(Object.keys(priorityRank).map((priority) => [priority, 0]));
  const bySource = {};
  for (const task of tasks) {
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    bySource[task.source] = (bySource[task.source] || 0) + 1;
  }

  return {
    totalTasks: tasks.length,
    byPriority,
    bySource,
  };
}

function sortTasks(tasks) {
  return tasks.sort((a, b) => {
    const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    const countDelta = b.count - a.count;
    if (countDelta !== 0) return countDelta;
    return `${a.source}:${a.type}`.localeCompare(`${b.source}:${b.type}`);
  });
}

function buildReport() {
  const sources = Object.entries(sourceFiles).map(([name, fileName]) => loadReport(name, fileName));
  const byName = Object.fromEntries(sources.map((source) => [source.name, source]));
  const tasks = [];

  addMissingReportTasks(tasks, sources);
  addReferenceTasks(tasks, byName.references);
  addRelationTasks(tasks, byName.relations);
  addMetricsTasks(tasks, byName.metrics);
  addBundleTasks(tasks, byName.bundle);
  sortTasks(tasks);

  return {
    generatedAt: new Date().toISOString(),
    sources: sources.map(({ name, file, available, generatedAt, error }) => ({
      name,
      file,
      available,
      generatedAt,
      error,
    })),
    summary: summarizeTasks(tasks),
    tasks,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK 维护汇总报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 来源报告',
    '',
    '| 来源 | 文件 | 状态 | 生成时间 |',
    '| --- | --- | --- | --- |',
  ];

  for (const source of report.sources) {
    lines.push(
      `| ${source.name} | ${source.file} | ${source.available ? 'available' : source.error} | ${source.generatedAt || '-'} |`,
    );
  }

  lines.push('', '## 汇总', '');
  lines.push(`- 维护任务总数: ${report.summary.totalTasks}`);
  for (const [priority, count] of Object.entries(report.summary.byPriority)) {
    lines.push(`- ${priority}: ${count}`);
  }

  lines.push('', '## 优先处理清单', '');
  if (report.tasks.length === 0) {
    lines.push('当前没有跨报告汇总出的维护任务。');
  } else {
    lines.push('| 优先级 | 来源 | 类型 | 数量 | 任务 |');
    lines.push('| --- | --- | --- | ---: | --- |');
    for (const task of report.tasks) {
      lines.push(`| ${task.priority} | ${task.source} | ${task.type} | ${task.count} | ${task.title} |`);
    }
  }

  lines.push('', '## 详情样例', '');
  const tasksWithDetails = report.tasks.filter((task) => task.details.length > 0);
  if (tasksWithDetails.length === 0) {
    lines.push('无详情样例。');
  } else {
    for (const task of tasksWithDetails.slice(0, 20)) {
      lines.push(`### ${task.priority} ${task.source}/${task.type}`);
      for (const detail of task.details.slice(0, 10)) {
        const summary = Object.entries(detail)
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([key, value]) => `${key}=${value}`)
          .join(', ');
        lines.push(`- ${summary}`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
ensureDir(reportDir);
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, renderMarkdown(report));

console.log('\n=== BREAK 维护汇总报告 ===\n');
console.log(`tasks=${report.summary.totalTasks}`);
for (const [priority, count] of Object.entries(report.summary.byPriority)) {
  console.log(`${priority}=${count}`);
}
console.log(`\n报告已保存到: ${reportMdPath}`);

if (report.summary.byPriority.P0 > 0) {
  process.exitCode = 1;
}
