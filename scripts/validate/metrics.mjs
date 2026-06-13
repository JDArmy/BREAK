import fs from 'fs';
import path from 'path';
import {
  ensureDir,
  loadEntities,
  projectRoot,
  readJson,
  writeJson,
} from '../search/common.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const reportJsonPath = path.join(reportDir, 'metrics-baseline.json');
const reportMdPath = path.join(reportDir, 'metrics-baseline.md');

const percent = (part, total) => (total ? Number(((part / total) * 100).toFixed(2)) : 0);
const isSubEntity = (key) => key.includes('-');
const unique = (values) => [...new Set(values.filter(Boolean))].sort();

function loadJsonRecords(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  const records = [];
  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json')).sort()) {
    const data = readJson(path.join(dir, file));
    for (const [key, entity] of Object.entries(data)) {
      records.push({ key, entity });
    }
  }
  return records;
}

function summarizeEntity(key, records) {
  const withReferences = records.filter(({ entity }) => Array.isArray(entity.references) && entity.references.length > 0).length;
  const references = records.reduce(
    (count, { entity }) => count + (Array.isArray(entity.references) ? entity.references.length : 0),
    0,
  );

  return {
    key,
    total: records.length,
    main: records.filter(({ key: entityKey }) => !isSubEntity(entityKey)).length,
    sub: records.filter(({ key: entityKey }) => isSubEntity(entityKey)).length,
    withReferences,
    references,
    referenceCoverageRate: percent(withReferences, records.length),
  };
}

function hasArrayValues(entity, field) {
  return Array.isArray(entity[field]) && entity[field].length > 0;
}

function summarizeCoverage(name, records, field) {
  const covered = records.filter(({ entity }) => hasArrayValues(entity, field)).length;
  return {
    name,
    total: records.length,
    covered,
    empty: records.length - covered,
    rate: percent(covered, records.length),
  };
}

function collectBusinessSceneRisks(scene) {
  return [
    ...(Array.isArray(scene.risks) ? scene.risks : []),
    ...Object.values(scene.riskScenes || {}).flatMap((riskScene) =>
      Array.isArray(riskScene.risks) ? riskScene.risks : [],
    ),
  ];
}

function buildReport() {
  const risks = loadEntities('risks');
  const avoidances = loadEntities('avoidances');
  const attackTools = loadEntities('attack-tools');
  const threatActors = loadEntities('threat-actors');
  const businessScenes = loadJsonRecords('src/BREAK/business-scenes');
  const avoidanceCategories = loadJsonRecords('src/BREAK/avoidance-categories');

  const entities = {
    risks: summarizeEntity('risks', risks),
    avoidances: summarizeEntity('avoidances', avoidances),
    attackTools: summarizeEntity('attackTools', attackTools),
    threatActors: summarizeEntity('threatActors', threatActors),
    businessScenes: {
      key: 'businessScenes',
      total: businessScenes.length,
      main: businessScenes.length,
      sub: 0,
      withReferences: 0,
      references: 0,
      referenceCoverageRate: 0,
    },
  };

  const referenceEntities = [entities.risks, entities.avoidances, entities.attackTools, entities.threatActors];
  const entitiesWithReferences = referenceEntities.reduce((sum, item) => sum + item.withReferences, 0);
  const entitiesChecked = referenceEntities.reduce((sum, item) => sum + item.total, 0);

  const riskComplexityCounts = new Map();
  for (const { entity } of risks) {
    const key = String(entity.complexity || 'unknown').trim() || 'unknown';
    riskComplexityCounts.set(key, (riskComplexityCounts.get(key) || 0) + 1);
  }

  const riskComplexity = [...riskComplexityCounts.entries()]
    .map(([key, count]) => ({ key, label: key, count, rate: percent(count, risks.length) }))
    .sort((a, b) => b.count - a.count);

  const avoidanceCategoriesSummary = avoidanceCategories
    .map(({ key, entity }) => {
      const count = avoidances.filter(({ entity: avoidance }) => avoidance.category === key).length;
      return {
        key,
        label: entity.title || key,
        count,
        rate: percent(count, avoidances.length),
      };
    })
    .sort((a, b) => b.count - a.count);

  const relationCoverage = [
    summarizeCoverage('Risk.avoidances', risks, 'avoidances'),
    summarizeCoverage('AttackTool.directCauseRisks', attackTools, 'directCauseRisks'),
    summarizeCoverage('AttackTool.indirectSupportRisks', attackTools, 'indirectSupportRisks'),
    summarizeCoverage('AttackTool.avoidances', attackTools, 'avoidances'),
    summarizeCoverage('ThreatActor.buildAttackTools', threatActors, 'buildAttackTools'),
    summarizeCoverage('ThreatActor.useAttackTools', threatActors, 'useAttackTools'),
    summarizeCoverage('ThreatActor.directCauseRisks', threatActors, 'directCauseRisks'),
    summarizeCoverage('ThreatActor.indirectSupportRisks', threatActors, 'indirectSupportRisks'),
  ];

  const businessSceneCoverage = businessScenes
    .map(({ key, entity }) => {
      const sceneRisks = collectBusinessSceneRisks(entity);
      const uniqueRisks = unique(sceneRisks);
      return {
        key,
        title: entity.title || key,
        riskCount: sceneRisks.length,
        uniqueRiskCount: uniqueRisks.length,
        duplicateRiskCount: sceneRisks.length - uniqueRisks.length,
        dimensionCount: Object.keys(entity.riskDimensions || {}).length,
        sceneCount: Object.keys(entity.riskScenes || {}).length,
      };
    })
    .sort((a, b) => b.uniqueRiskCount - a.uniqueRiskCount);

  return {
    generatedAt: new Date().toISOString(),
    entities,
    reference: {
      total: referenceEntities.reduce((sum, item) => sum + item.references, 0),
      entitiesWithReferences,
      entitiesChecked,
      coverageRate: percent(entitiesWithReferences, entitiesChecked),
    },
    riskComplexity,
    avoidanceCategories: avoidanceCategoriesSummary,
    relationCoverage,
    businessSceneCoverage,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK 指标基线报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 实体规模',
    '',
    '| 实体 | 总数 | 主条目 | 子条目 | 有参考资料 | 参考资料覆盖率 |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const item of Object.values(report.entities)) {
    lines.push(
      `| ${item.key} | ${item.total} | ${item.main} | ${item.sub} | ${item.withReferences} | ${item.referenceCoverageRate}% |`,
    );
  }

  lines.push('', '## 内容可信度', '');
  lines.push(`- 参考资料总数: ${report.reference.total}`);
  lines.push(`- 有参考资料实体: ${report.reference.entitiesWithReferences}/${report.reference.entitiesChecked}`);
  lines.push(`- 参考资料覆盖率: ${report.reference.coverageRate}%`);

  lines.push('', '## 风险复杂度分布', '');
  lines.push('| 复杂度 | 数量 | 占比 |');
  lines.push('| --- | ---: | ---: |');
  for (const item of report.riskComplexity) {
    lines.push(`| ${item.label} | ${item.count} | ${item.rate}% |`);
  }

  lines.push('', '## 规避分类分布', '');
  lines.push('| 分类 | 数量 | 占比 |');
  lines.push('| --- | ---: | ---: |');
  for (const item of report.avoidanceCategories) {
    lines.push(`| ${item.key} ${item.label} | ${item.count} | ${item.rate}% |`);
  }

  lines.push('', '## 关系覆盖', '');
  lines.push('| 关系字段 | 总数 | 有值 | 空值 | 覆盖率 |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const item of report.relationCoverage) {
    lines.push(`| ${item.name} | ${item.total} | ${item.covered} | ${item.empty} | ${item.rate}% |`);
  }

  lines.push('', '## 业务场景覆盖 Top 10', '');
  lines.push('| 场景 | 唯一风险 | 重复引用 | 维度 | 子场景 |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const item of report.businessSceneCoverage.slice(0, 10)) {
    lines.push(
      `| ${item.key} ${item.title} | ${item.uniqueRiskCount} | ${item.duplicateRiskCount} | ${item.dimensionCount} | ${item.sceneCount} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
ensureDir(reportDir);
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, renderMarkdown(report));

console.log('\n=== BREAK 指标基线报告 ===\n');
console.log(`references=${report.reference.total}`);
console.log(`referenceCoverage=${report.reference.coverageRate}%`);
for (const item of report.relationCoverage) {
  console.log(`${item.name}: ${item.covered}/${item.total} (${item.rate}%)`);
}
console.log(`\n报告已保存到: ${reportMdPath}`);
