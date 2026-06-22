import fs from 'fs';
import path from 'path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';

const riskDir = path.join(projectRoot, 'src/BREAK/risks');
const enRiskDir = path.join(projectRoot, 'src/i18n/en/BREAK/risks');
const caseDir = path.join(projectRoot, 'src/BREAK/cases');
const reportDir = path.join(projectRoot, 'research/search-reports');
const strict = process.argv.includes('--strict');

const genericZhInfluence = '可能造成业务滥用、数据泄露、资金损失、合规处罚或供应链扩散风险。';
const genericEnInfluence =
  'May cause business abuse, data exposure, financial loss, compliance impact, or supply-chain propagation.';

function loadEntityDir(dir) {
  const records = [];
  for (const file of fs
    .readdirSync(dir)
    .filter((item) => item.endsWith('.json'))
    .sort()) {
    const filePath = path.join(dir, file);
    const data = readJson(filePath);
    for (const [key, entity] of Object.entries(data)) {
      records.push({ key, filePath, entity });
    }
  }
  return records;
}

function sameText(left, right) {
  return String(left || '').trim() === String(right || '').trim();
}

function duplicateGroups(records, field) {
  const groups = new Map();
  for (const { key, entity } of records) {
    const value = String(entity[field] || '').trim();
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(key);
  }
  return [...groups.entries()]
    .filter(([, keys]) => keys.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([value, keys]) => ({ value, keys, count: keys.length }));
}

function buildReport() {
  const zhRisks = loadEntityDir(riskDir);
  const enRisks = loadEntityDir(enRiskDir);
  const cases = loadEntityDir(caseDir);

  const zhDefinitionEqualsDescription = zhRisks
    .filter(({ entity }) => sameText(entity.definition, entity.description))
    .map(({ key, entity, filePath }) => ({
      key,
      title: entity.title,
      file: path.relative(projectRoot, filePath),
    }));

  const zhSingleKeyword = zhRisks
    .filter(({ entity }) => (entity.keywords || []).length <= 1)
    .map(({ key, entity, filePath }) => ({
      key,
      title: entity.title,
      keywords: entity.keywords || [],
      file: path.relative(projectRoot, filePath),
    }));

  const zhGenericInfluence = zhRisks
    .filter(({ entity }) => entity.influence === genericZhInfluence)
    .map(({ key, entity, filePath }) => ({
      key,
      title: entity.title,
      file: path.relative(projectRoot, filePath),
    }));

  const enDefinitionEqualsDescription = enRisks
    .filter(({ entity }) => sameText(entity.definition, entity.description))
    .map(({ key, entity, filePath }) => ({
      key,
      title: entity.title,
      file: path.relative(projectRoot, filePath),
    }));

  const enSingleKeyword = enRisks
    .filter(({ entity }) => (entity.keywords || []).length <= 1)
    .map(({ key, entity, filePath }) => ({
      key,
      title: entity.title,
      keywords: entity.keywords || [],
      file: path.relative(projectRoot, filePath),
    }));

  const enGenericInfluence = enRisks
    .filter(({ entity }) => entity.influence === genericEnInfluence)
    .map(({ key, entity, filePath }) => ({
      key,
      title: entity.title,
      file: path.relative(projectRoot, filePath),
    }));

  const singleSourceCases = cases
    .filter(({ entity }) => (entity.references || []).length === 1)
    .map(({ key, entity, filePath }) => ({
      key,
      title: entity.title,
      category: entity.category,
      file: path.relative(projectRoot, filePath),
    }));

  const caseCategoryStats = {};
  for (const { entity } of cases) {
    const category = entity.category || 'unknown';
    if (!caseCategoryStats[category]) {
      caseCategoryStats[category] = {
        total: 0,
        singleSource: 0,
      };
    }
    caseCategoryStats[category].total++;
    if ((entity.references || []).length === 1) {
      caseCategoryStats[category].singleSource++;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      zhRiskCount: zhRisks.length,
      enRiskCount: enRisks.length,
      zhDefinitionEqualsDescription: zhDefinitionEqualsDescription.length,
      zhSingleKeyword: zhSingleKeyword.length,
      zhGenericInfluence: zhGenericInfluence.length,
      enDefinitionEqualsDescription: enDefinitionEqualsDescription.length,
      enSingleKeyword: enSingleKeyword.length,
      enGenericInfluence: enGenericInfluence.length,
      caseCount: cases.length,
      singleSourceCases: singleSourceCases.length,
      singleSourceCaseRate: cases.length ? Number(((singleSourceCases.length / cases.length) * 100).toFixed(2)) : 0,
    },
    issues: {
      zhDefinitionEqualsDescription,
      zhSingleKeyword,
      zhGenericInfluence,
      enDefinitionEqualsDescription,
      enSingleKeyword,
      enGenericInfluence,
      singleSourceCases,
      zhDuplicateInfluenceGroups: duplicateGroups(zhRisks, 'influence').slice(0, 20),
    },
    caseCategoryStats,
  };
}

function renderReport(report) {
  const lines = [
    '# BREAK 内容质量审计报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 风险内容指标',
    '',
    '| 指标 | 数量 |',
    '| --- | ---: |',
  ];

  for (const [key, value] of Object.entries(report.stats)) {
    lines.push(`| ${key} | ${value} |`);
  }

  lines.push('', '## 中文重复 influence Top 20', '');
  for (const group of report.issues.zhDuplicateInfluenceGroups) {
    lines.push(`- ${group.count} 条：${group.keys.join(', ')} — ${group.value}`);
  }

  lines.push('', '## 案例单源统计', '');
  lines.push('| category | total | singleSource | rate |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const [category, stat] of Object.entries(report.caseCategoryStats)) {
    const rate = stat.total ? Number(((stat.singleSource / stat.total) * 100).toFixed(2)) : 0;
    lines.push(`| ${category} | ${stat.total} | ${stat.singleSource} | ${rate}% |`);
  }

  for (const [key, items] of Object.entries(report.issues)) {
    if (['zhDuplicateInfluenceGroups', 'singleSourceCases'].includes(key)) continue;
    if (!items.length) continue;
    lines.push('', `## ${key}`, '');
    for (const item of items) {
      lines.push(`- ${item.key} ${item.title || ''} (${item.file})`);
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'content-quality.json'), report);
fs.writeFileSync(path.join(reportDir, 'content-quality.md'), renderReport(report));

console.log('\n=== BREAK 内容质量审计 ===\n');
for (const [key, value] of Object.entries(report.stats)) {
  console.log(`${key}: ${value}`);
}
console.log(`\n报告已保存到: ${path.join(reportDir, 'content-quality.md')}`);

const hasBlockingIssues =
  report.stats.zhDefinitionEqualsDescription > 0 ||
  report.stats.zhSingleKeyword > 0 ||
  report.stats.zhGenericInfluence > 0 ||
  report.stats.enDefinitionEqualsDescription > 0 ||
  report.stats.enSingleKeyword > 0 ||
  report.stats.enGenericInfluence > 0;

if (strict && hasBlockingIssues) {
  process.exitCode = 1;
}
