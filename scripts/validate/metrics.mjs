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
const issueLabels = {
  risk_low_avoidance_coverage: '风险规避覆盖偏弱',
  attack_tool_without_avoidances: '攻击工具缺少规避手段',
  threat_actor_without_tools: '威胁行为者缺少工具关系',
  business_scene_without_risks: '业务场景未覆盖风险',
  business_scene_high_duplicate_risks: '业务场景风险重复引用偏高',
};

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
  const emptyItems = records
    .filter(({ entity }) => !hasArrayValues(entity, field))
    .map(({ key, entity }) => ({ key, title: entity.title || '' }));
  const covered = records.length - emptyItems.length;
  return {
    name,
    field,
    total: records.length,
    covered,
    empty: emptyItems.length,
    rate: percent(covered, records.length),
    emptyItems,
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

function collectRelationDegrees({ risks, avoidances, attackTools, threatActors }) {
  const degreeMap = new Map();
  const addDegree = (type, key, amount = 1) => {
    const id = `${type}:${key}`;
    const current = degreeMap.get(id) || { type, key, title: '', degree: 0, inbound: 0, outbound: 0 };
    current.degree += amount;
    degreeMap.set(id, current);
  };
  const addInbound = (type, key, amount = 1) => {
    const id = `${type}:${key}`;
    const current = degreeMap.get(id) || { type, key, title: '', degree: 0, inbound: 0, outbound: 0 };
    current.inbound += amount;
    current.degree += amount;
    degreeMap.set(id, current);
  };
  const addOutbound = (type, key, amount = 1) => {
    const id = `${type}:${key}`;
    const current = degreeMap.get(id) || { type, key, title: '', degree: 0, inbound: 0, outbound: 0 };
    current.outbound += amount;
    current.degree += amount;
    degreeMap.set(id, current);
  };

  for (const { key, entity } of risks) {
    addOutbound('risk', key, entity.avoidances?.length || 0);
    for (const avoidanceKey of entity.avoidances || []) addInbound('avoidance', avoidanceKey);
  }
  for (const { key, entity } of attackTools) {
    const riskRefs = [...(entity.directCauseRisks || []), ...(entity.indirectSupportRisks || [])];
    const avoidanceRefs = entity.avoidances || [];
    addOutbound('attackTool', key, riskRefs.length + avoidanceRefs.length);
    for (const riskKey of riskRefs) addInbound('risk', riskKey);
    for (const avoidanceKey of avoidanceRefs) addInbound('avoidance', avoidanceKey);
  }
  for (const { key, entity } of threatActors) {
    const attackToolRefs = [...(entity.buildAttackTools || []), ...(entity.useAttackTools || [])];
    const riskRefs = [...(entity.directCauseRisks || []), ...(entity.indirectSupportRisks || [])];
    addOutbound('threatActor', key, attackToolRefs.length + riskRefs.length);
    for (const attackToolKey of attackToolRefs) addInbound('attackTool', attackToolKey);
    for (const riskKey of riskRefs) addInbound('risk', riskKey);
  }

  const titles = new Map([
    ...risks.map(({ key, entity }) => [`risk:${key}`, entity.title || '']),
    ...avoidances.map(({ key, entity }) => [`avoidance:${key}`, entity.title || '']),
    ...attackTools.map(({ key, entity }) => [`attackTool:${key}`, entity.title || '']),
    ...threatActors.map(({ key, entity }) => [`threatActor:${key}`, entity.title || '']),
  ]);

  return [...degreeMap.values()]
    .map((item) => ({ ...item, title: titles.get(`${item.type}:${item.key}`) || '' }))
    .filter((item) => item.degree > 0)
    .sort((a, b) => b.degree - a.degree);
}

function collectWeakRelations({ risks, attackTools, threatActors }) {
  const weakRiskAvoidance = risks
    .filter(({ entity }) => (entity.avoidances || []).length <= 1)
    .map(({ key, entity }) => ({
      type: 'risk_low_avoidance_coverage',
      entityType: 'risk',
      key,
      title: entity.title || '',
      count: entity.avoidances?.length || 0,
      message: `Risk 关联规避手段数量偏低: ${key}`,
    }));

  const attackToolsWithoutAvoidances = attackTools
    .filter(({ entity }) => !hasArrayValues(entity, 'avoidances'))
    .map(({ key, entity }) => ({
      type: 'attack_tool_without_avoidances',
      entityType: 'attackTool',
      key,
      title: entity.title || '',
      count: 0,
      message: `AttackTool 缺少规避手段: ${key}`,
    }));

  const threatActorsWithoutTools = threatActors
    .filter(({ entity }) => !hasArrayValues(entity, 'buildAttackTools') && !hasArrayValues(entity, 'useAttackTools'))
    .map(({ key, entity }) => ({
      type: 'threat_actor_without_tools',
      entityType: 'threatActor',
      key,
      title: entity.title || '',
      count: 0,
      message: `ThreatActor 缺少工具关系: ${key}`,
    }));

  return [...weakRiskAvoidance, ...attackToolsWithoutAvoidances, ...threatActorsWithoutTools].sort((a, b) =>
    a.type.localeCompare(b.type) || a.key.localeCompare(b.key),
  );
}

function collectSceneIssues(businessScenes) {
  return businessScenes.flatMap(({ key, entity }) => {
    const sceneRisks = collectBusinessSceneRisks(entity);
    const uniqueRisks = unique(sceneRisks);
    const duplicateRiskCount = sceneRisks.length - uniqueRisks.length;
    const issues = [];

    if (uniqueRisks.length === 0) {
      issues.push({
        type: 'business_scene_without_risks',
        key,
        title: entity.title || '',
        message: `BusinessScene 未覆盖风险: ${key}`,
      });
    }
    if (sceneRisks.length > 0 && duplicateRiskCount / sceneRisks.length >= 0.15) {
      issues.push({
        type: 'business_scene_high_duplicate_risks',
        key,
        title: entity.title || '',
        duplicateRiskCount,
        riskCount: sceneRisks.length,
        message: `BusinessScene 风险重复引用偏高: ${key}`,
      });
    }

    return issues;
  });
}

function buildMaintenanceTasks({ relationCoverage, weakRelations, sceneIssues }) {
  const tasks = [];

  for (const item of relationCoverage.filter((entry) => entry.empty > 0 || entry.rate < 95)) {
    tasks.push({
      priority: item.rate < 85 ? 'P1' : 'P2',
      type: 'relation_coverage',
      title: `${item.name} 存在 ${item.empty} 个空值实体`,
      count: item.empty,
    });
  }
  for (const type of [...new Set(weakRelations.map((item) => item.type))].sort()) {
    const count = weakRelations.filter((item) => item.type === type).length;
    tasks.push({
      priority: type === 'risk_low_avoidance_coverage' ? 'P2' : 'P1',
      type,
      title: `${issueLabels[type] || type}: ${count}`,
      count,
    });
  }
  for (const type of [...new Set(sceneIssues.map((item) => item.type))].sort()) {
    const count = sceneIssues.filter((item) => item.type === type).length;
    tasks.push({
      priority: 'P2',
      type,
      title: `${issueLabels[type] || type}: ${count}`,
      count,
    });
  }

  return tasks.sort((a, b) => a.priority.localeCompare(b.priority) || b.count - a.count);
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

  const highDegreeNodes = collectRelationDegrees({ risks, avoidances, attackTools, threatActors }).slice(0, 20);
  const weakRelations = collectWeakRelations({ risks, attackTools, threatActors });
  const sceneIssues = collectSceneIssues(businessScenes);
  const maintenanceTasks = buildMaintenanceTasks({ relationCoverage, weakRelations, sceneIssues });

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
    highDegreeNodes,
    weakRelations,
    sceneIssues,
    maintenanceTasks,
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

  lines.push('', '## 维护任务清单', '');
  if (report.maintenanceTasks.length === 0) {
    lines.push('当前没有由指标基线生成的维护任务。');
  } else {
    lines.push('| 优先级 | 类型 | 数量 | 任务 |');
    lines.push('| --- | --- | ---: | --- |');
    for (const item of report.maintenanceTasks) {
      lines.push(`| ${item.priority} | ${item.type} | ${item.count} | ${item.title} |`);
    }
  }

  lines.push('', '## 关系空值明细', '');
  for (const item of report.relationCoverage.filter((entry) => entry.emptyItems.length > 0)) {
    lines.push(`### ${item.name}`);
    for (const entity of item.emptyItems.slice(0, 30)) {
      lines.push(`- ${entity.key} ${entity.title}`);
    }
    if (item.emptyItems.length > 30) {
      lines.push(`- 另有 ${item.emptyItems.length - 30} 条未显示，请查看 JSON 报告。`);
    }
    lines.push('');
  }

  lines.push('', '## 关系弱覆盖', '');
  if (report.weakRelations.length === 0) {
    lines.push('未发现关系弱覆盖项。');
  } else {
    lines.push('| 类型 | 实体 | 计数 | 说明 |');
    lines.push('| --- | --- | ---: | --- |');
    for (const item of report.weakRelations.slice(0, 80)) {
      lines.push(`| ${item.type} | ${item.key} ${item.title} | ${item.count} | ${item.message} |`);
    }
  }

  lines.push('', '## 高关联节点 Top 20', '');
  lines.push('| 类型 | 实体 | 总关联 | 入向 | 出向 |');
  lines.push('| --- | --- | ---: | ---: | ---: |');
  for (const item of report.highDegreeNodes) {
    lines.push(`| ${item.type} | ${item.key} ${item.title} | ${item.degree} | ${item.inbound} | ${item.outbound} |`);
  }

  lines.push('', '## 业务场景覆盖 Top 10', '');
  lines.push('| 场景 | 唯一风险 | 重复引用 | 维度 | 子场景 |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const item of report.businessSceneCoverage.slice(0, 10)) {
    lines.push(
      `| ${item.key} ${item.title} | ${item.uniqueRiskCount} | ${item.duplicateRiskCount} | ${item.dimensionCount} | ${item.sceneCount} |`,
    );
  }

  lines.push('', '## 业务场景异常', '');
  if (report.sceneIssues.length === 0) {
    lines.push('未发现业务场景覆盖异常。');
  } else {
    for (const item of report.sceneIssues) {
      lines.push(`- [${item.type}] ${item.message}`);
    }
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
console.log(`maintenanceTasks=${report.maintenanceTasks.length}`);
console.log(`weakRelations=${report.weakRelations.length}`);
console.log(`sceneIssues=${report.sceneIssues.length}`);
console.log(`\n报告已保存到: ${reportMdPath}`);
