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
const reportJsonPath = path.join(reportDir, 'relationship-coverage.json');
const reportMdPath = path.join(reportDir, 'relationship-coverage.md');

function loadBusinessScenes() {
  const dir = path.join(projectRoot, 'src/BREAK/business-scenes');
  const records = [];
  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json')).sort()) {
    const data = readJson(path.join(dir, file));
    for (const [key, entity] of Object.entries(data)) {
      records.push({ key, entity });
    }
  }
  return records;
}

function ids(records) {
  return new Set(records.map((record) => record.key));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function hasValues(entity, field) {
  return Array.isArray(entity[field]) && entity[field].length > 0;
}

function coverage(records, field) {
  const covered = records.filter(({ entity }) => hasValues(entity, field)).length;
  return {
    total: records.length,
    covered,
    empty: records.length - covered,
    rate: records.length ? Number(((covered / records.length) * 100).toFixed(2)) : 0,
  };
}

function threatActorToolCoverage(records) {
  const covered = records.filter(
    ({ entity }) => hasValues(entity, 'buildAttackTools') || hasValues(entity, 'useAttackTools'),
  ).length;
  return {
    total: records.length,
    covered,
    empty: records.length - covered,
    rate: records.length ? Number(((covered / records.length) * 100).toFixed(2)) : 0,
  };
}

function addIssue(issues, severity, type, message, details = {}) {
  issues.push({ severity, type, message, ...details });
}

function collectRelationAudit() {
  const risks = loadEntities('risks');
  const avoidances = loadEntities('avoidances');
  const attackTools = loadEntities('attack-tools');
  const threatActors = loadEntities('threat-actors');
  const cases = loadEntities('cases');
  const businessScenes = loadBusinessScenes();

  const riskIds = ids(risks);
  const avoidanceIds = ids(avoidances);
  const attackToolIds = ids(attackTools);
  const threatActorIds = ids(threatActors);
  const issues = [];

  const riskAvoidanceRefs = unique(risks.flatMap(({ entity }) => entity.avoidances || []));
  const attackToolRiskRefs = unique(
    attackTools.flatMap(({ entity }) => [
      ...(entity.directCauseRisks || []),
      ...(entity.indirectSupportRisks || []),
    ]),
  );
  const attackToolAvoidanceRefs = unique(attackTools.flatMap(({ entity }) => entity.avoidances || []));
  const threatActorAttackToolRefs = unique(
    threatActors.flatMap(({ entity }) => [
      ...(entity.buildAttackTools || []),
      ...(entity.useAttackTools || []),
    ]),
  );
  const threatActorRiskRefs = unique(
    threatActors.flatMap(({ entity }) => [
      ...(entity.directCauseRisks || []),
      ...(entity.indirectSupportRisks || []),
    ]),
  );
  const sceneRiskRefs = unique(
    businessScenes.flatMap(({ entity }) => [
      ...(entity.risks || []),
      ...Object.values(entity.riskScenes || {}).flatMap((scene) => scene.risks || []),
    ]),
  );

  for (const ref of riskAvoidanceRefs) {
    if (!avoidanceIds.has(ref)) {
      addIssue(issues, 'error', 'invalid_risk_avoidance_ref', `Risk 引用了不存在的 Avoidance: ${ref}`, { ref });
    }
  }
  for (const ref of attackToolRiskRefs) {
    if (!riskIds.has(ref)) {
      addIssue(issues, 'error', 'invalid_attack_tool_risk_ref', `AttackTool 引用了不存在的 Risk: ${ref}`, { ref });
    }
  }
  for (const ref of attackToolAvoidanceRefs) {
    if (!avoidanceIds.has(ref)) {
      addIssue(issues, 'error', 'invalid_attack_tool_avoidance_ref', `AttackTool 引用了不存在的 Avoidance: ${ref}`, { ref });
    }
  }
  for (const ref of threatActorAttackToolRefs) {
    if (!attackToolIds.has(ref)) {
      addIssue(issues, 'error', 'invalid_threat_actor_attack_tool_ref', `ThreatActor 引用了不存在的 AttackTool: ${ref}`, { ref });
    }
  }
  for (const ref of threatActorRiskRefs) {
    if (!riskIds.has(ref)) {
      addIssue(issues, 'error', 'invalid_threat_actor_risk_ref', `ThreatActor 引用了不存在的 Risk: ${ref}`, { ref });
    }
  }
  for (const ref of sceneRiskRefs) {
    if (!riskIds.has(ref)) {
      addIssue(issues, 'error', 'invalid_business_scene_risk_ref', `BusinessScene 引用了不存在的 Risk: ${ref}`, { ref });
    }
  }

  const referencedAvoidances = new Set([...riskAvoidanceRefs, ...attackToolAvoidanceRefs]);
  const referencedRisks = new Set([...attackToolRiskRefs, ...threatActorRiskRefs, ...sceneRiskRefs]);
  const referencedAttackTools = new Set(threatActorAttackToolRefs);

  const unreferencedAvoidances = avoidances
    .filter(({ key }) => !referencedAvoidances.has(key))
    .map(({ key, entity }) => ({ key, title: entity.title || '' }));
  const unreferencedMainRisks = risks
    .filter(({ key }) => !key.includes('-') && !referencedRisks.has(key))
    .map(({ key, entity }) => ({ key, title: entity.title || '' }));
  const attackToolsWithoutThreatActors = attackTools
    .filter(({ key }) => !referencedAttackTools.has(key))
    .map(({ key, entity }) => ({ key, title: entity.title || '' }));

  for (const item of unreferencedAvoidances) {
    addIssue(issues, 'review', 'unreferenced_avoidance', `未被 Risk/AttackTool 引用的 Avoidance: ${item.key}`, item);
  }
  for (const item of unreferencedMainRisks) {
    addIssue(issues, 'review', 'unreferenced_main_risk', `未被场景/工具/行为者引用的主 Risk: ${item.key}`, item);
  }
  for (const item of attackToolsWithoutThreatActors) {
    addIssue(issues, 'info', 'attack_tool_without_threat_actor', `未被 ThreatActor 引用的 AttackTool: ${item.key}`, item);
  }

  const summaries = [
    { name: 'Risk.avoidances', ...coverage(risks, 'avoidances') },
    { name: 'AttackTool.directCauseRisks', ...coverage(attackTools, 'directCauseRisks') },
    { name: 'AttackTool.indirectSupportRisks', ...coverage(attackTools, 'indirectSupportRisks') },
    { name: 'AttackTool.avoidances', ...coverage(attackTools, 'avoidances') },
    { name: 'ThreatActor.attackTools', ...threatActorToolCoverage(threatActors) },
    { name: 'ThreatActor.buildAttackTools', observationOnly: true, ...coverage(threatActors, 'buildAttackTools') },
    { name: 'ThreatActor.useAttackTools', observationOnly: true, ...coverage(threatActors, 'useAttackTools') },
    { name: 'ThreatActor.directCauseRisks', ...coverage(threatActors, 'directCauseRisks') },
    { name: 'ThreatActor.indirectSupportRisks', ...coverage(threatActors, 'indirectSupportRisks') },
    { name: 'Case.relatedRisks', observationOnly: true, ...coverage(cases, 'relatedRisks') },
  ];

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      risks: risks.length,
      avoidances: avoidances.length,
      attackTools: attackTools.length,
      threatActors: threatActors.length,
      businessScenes: businessScenes.length,
      cases: cases.length,
    },
    summaries,
    review: {
      unreferencedAvoidances,
      unreferencedMainRisks,
      attackToolsWithoutThreatActors,
    },
    issues,
  };
}

function renderMarkdown(report) {
  const reviewCounts = {
    unreferencedAvoidances: report.review.unreferencedAvoidances.length,
    unreferencedMainRisks: report.review.unreferencedMainRisks.length,
    attackToolsWithoutThreatActors: report.review.attackToolsWithoutThreatActors.length,
  };
  const hasReviewItems = Object.values(reviewCounts).some((count) => count > 0);
  const lines = [
    '# BREAK 关系覆盖审计报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 覆盖概览',
    '',
    '| 关系字段 | 总数 | 有值 | 空值 | 覆盖率 |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];

  for (const item of report.summaries) {
    lines.push(`| ${item.name} | ${item.total} | ${item.covered} | ${item.empty} | ${item.rate}% |`);
  }

  lines.push('', hasReviewItems ? '## 待复核清单' : '## 待复核清单（已通过）', '');
  if (hasReviewItems) {
    lines.push(`- 未被 Risk/AttackTool 引用的 Avoidance: ${reviewCounts.unreferencedAvoidances}`);
    lines.push(`- 未被场景/工具/行为者引用的主 Risk: ${reviewCounts.unreferencedMainRisks}`);
    lines.push(`- 未被 ThreatActor 引用的 AttackTool: ${reviewCounts.attackToolsWithoutThreatActors}`);
  } else {
    lines.push('✅ 未发现需要复核的关系覆盖项。');
  }

  const severities = ['error', 'review', 'info'];
  lines.push('', '## 问题汇总', '');
  for (const severity of severities) {
    const count = report.issues.filter((issue) => issue.severity === severity).length;
    lines.push(`- ${severity}: ${count}`);
  }

  lines.push('', '## 问题详情', '');
  if (report.issues.length === 0) {
    lines.push('未发现关系覆盖问题。');
  } else {
    for (const issue of report.issues.slice(0, 120)) {
      lines.push(`- [${issue.severity}] \`${issue.type}\` ${issue.message}`);
      if (issue.title) lines.push(`  - title: ${issue.title}`);
    }
    if (report.issues.length > 120) {
      lines.push(`- 另有 ${report.issues.length - 120} 条未显示，请查看 JSON 报告。`);
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = collectRelationAudit();
ensureDir(reportDir);
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, renderMarkdown(report));

console.log('\n=== BREAK 关系覆盖审计报告 ===\n');
for (const item of report.summaries) {
  console.log(`${item.name}: ${item.covered}/${item.total} (${item.rate}%)`);
}
const reviewCounts = {
  unreferencedAvoidances: report.review.unreferencedAvoidances.length,
  unreferencedMainRisks: report.review.unreferencedMainRisks.length,
  attackToolsWithoutThreatActors: report.review.attackToolsWithoutThreatActors.length,
};
const hasReviewItems = Object.values(reviewCounts).some((count) => count > 0);
if (hasReviewItems) {
  console.log('\n## 待复核');
  console.log(`unreferencedAvoidances=${reviewCounts.unreferencedAvoidances}`);
  console.log(`unreferencedMainRisks=${reviewCounts.unreferencedMainRisks}`);
  console.log(`attackToolsWithoutThreatActors=${reviewCounts.attackToolsWithoutThreatActors}`);
} else {
  console.log('\n✅ 待复核项: 0');
}
console.log(`\n报告已保存到: ${reportMdPath}`);

if (process.argv.includes('--strict') && report.issues.some((issue) => issue.severity === 'error')) {
  process.exitCode = 1;
}
