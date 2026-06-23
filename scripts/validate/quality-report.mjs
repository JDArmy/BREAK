import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, loadEntities, projectRoot, readJson, writeJson } from '../search/common.mjs';

const publicReportPath = path.join(projectRoot, 'public/data/quality-report.json');
const researchReportPath = path.join(projectRoot, 'research/search-reports/quality-report.json');
const referenceHealthReportPath = path.join(projectRoot, 'research/search-reports/reference-health.json');
const caseSourceQualityReportPath = path.join(projectRoot, 'research/search-reports/case-source-quality.json');
const maxEmbeddedIssueItems = 100;

const entityLabels = {
  risk: 'Risk',
  avoidance: 'Avoidance',
  attackTool: 'AttackTool',
  threatActor: 'ThreatActor',
  term: 'Term',
  businessScene: 'BusinessScene',
  case: 'Case',
};

const entityDirs = [
  { type: 'risk', zhDir: 'src/BREAK/risks', enDir: 'src/i18n/en/BREAK/risks' },
  { type: 'avoidance', zhDir: 'src/BREAK/avoidances', enDir: 'src/i18n/en/BREAK/avoidances' },
  { type: 'attackTool', zhDir: 'src/BREAK/attack-tools', enDir: 'src/i18n/en/BREAK/attack-tools' },
  { type: 'threatActor', zhDir: 'src/BREAK/threat-actors', enDir: 'src/i18n/en/BREAK/threat-actors' },
  { type: 'term', zhDir: 'src/BREAK/terms', enDir: 'src/i18n/en/BREAK/terms' },
  { type: 'businessScene', zhDir: 'src/BREAK/business-scenes', enDir: 'src/i18n/en/BREAK/business-scenes' },
  { type: 'case', zhDir: 'src/BREAK/cases', enDir: 'src/i18n/en/BREAK/cases' },
];

const relationCoverageFields = [
  { entityType: 'risk', collection: 'risks', field: 'avoidances', label: 'Risk.avoidances' },
  { entityType: 'attackTool', collection: 'attackTools', field: 'directCauseRisks', label: 'AttackTool.directCauseRisks' },
  { entityType: 'attackTool', collection: 'attackTools', field: 'indirectSupportRisks', label: 'AttackTool.indirectSupportRisks' },
  { entityType: 'attackTool', collection: 'attackTools', field: 'avoidances', label: 'AttackTool.avoidances' },
  { entityType: 'threatActor', collection: 'threatActors', field: 'directCauseRisks', label: 'ThreatActor.directCauseRisks' },
  { entityType: 'threatActor', collection: 'threatActors', field: 'indirectSupportRisks', label: 'ThreatActor.indirectSupportRisks' },
];

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

function loadKeySet(relativeDir) {
  return new Set(loadJsonRecords(relativeDir).map(({ key }) => key));
}

function hasArrayValues(entity, field) {
  return Array.isArray(entity[field]) && entity[field].length > 0;
}

function issueId(prefix, ...parts) {
  return [prefix, ...parts].filter(Boolean).join(':');
}

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function collectBusinessSceneRisks(scene) {
  return [
    ...(Array.isArray(scene.risks) ? scene.risks : []),
    ...Object.values(scene.riskScenes || {}).flatMap((riskScene) =>
      Array.isArray(riskScene.risks) ? riskScene.risks : [],
    ),
  ];
}

function collectWeakRelations({ risks, attackTools, threatActors }) {
  const weakRiskAvoidance = risks
    .filter(({ entity }) => (entity.avoidances || []).length <= 1)
    .map(({ key, entity }) => ({
      id: issueId('weakRelation', 'riskLowAvoidanceCoverage', key),
      type: 'riskLowAvoidanceCoverage',
      severity: 'review',
      entityType: 'risk',
      key,
      title: entity.title || '',
      count: entity.avoidances?.length || 0,
      message: `Risk 关联规避手段数量偏低: ${key}`,
    }));

  const attackToolsWithoutAvoidances = attackTools
    .filter(({ entity }) => !hasArrayValues(entity, 'avoidances'))
    .map(({ key, entity }) => ({
      id: issueId('weakRelation', 'attackToolWithoutAvoidances', key),
      type: 'attackToolWithoutAvoidances',
      severity: 'error',
      entityType: 'attackTool',
      key,
      title: entity.title || '',
      count: 0,
      message: `AttackTool 缺少规避手段: ${key}`,
    }));

  const threatActorsWithoutTools = threatActors
    .filter(({ entity }) => !hasArrayValues(entity, 'buildAttackTools') && !hasArrayValues(entity, 'useAttackTools'))
    .map(({ key, entity }) => ({
      id: issueId('weakRelation', 'threatActorWithoutTools', key),
      type: 'threatActorWithoutTools',
      severity: 'error',
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

function collectMissingCoverage(collections) {
  const fieldIssues = relationCoverageFields.flatMap((config) =>
    collections[config.collection]
      .filter(({ entity }) => !hasArrayValues(entity, config.field))
      .map(({ key, entity }) => ({
        id: issueId('missingCoverage', config.label, key),
        type: 'missingRelationField',
        severity: 'error',
        entityType: config.entityType,
        key,
        title: entity.title || '',
        field: config.field,
        relation: config.label,
        message: `${config.label} 缺少关系数据: ${key}`,
      })),
  );

  const threatActorToolIssues = collections.threatActors
    .filter(({ entity }) => !hasArrayValues(entity, 'buildAttackTools') && !hasArrayValues(entity, 'useAttackTools'))
    .map(({ key, entity }) => ({
      id: issueId('missingCoverage', 'ThreatActor.attackTools', key),
      type: 'missingRelationField',
      severity: 'error',
      entityType: 'threatActor',
      key,
      title: entity.title || '',
      field: 'attackTools',
      relation: 'ThreatActor.attackTools',
      message: `ThreatActor 缺少 buildAttackTools/useAttackTools 关系数据: ${key}`,
    }));

  return [...fieldIssues, ...threatActorToolIssues].sort((a, b) =>
    a.entityType.localeCompare(b.entityType) || a.key.localeCompare(b.key) || a.field.localeCompare(b.field),
  );
}

function collectSceneIssues(businessScenes, riskIds) {
  return businessScenes.flatMap(({ key, entity }) => {
    const sceneRisks = collectBusinessSceneRisks(entity);
    const uniqueRisks = unique(sceneRisks);
    const issues = [];

    if (uniqueRisks.length === 0) {
      issues.push({
        id: issueId('sceneIssue', 'businessSceneWithoutRisks', key),
        type: 'businessSceneWithoutRisks',
        severity: 'review',
        entityType: 'businessScene',
        key,
        title: entity.title || '',
        message: `BusinessScene 未覆盖风险: ${key}`,
      });
    }

    const invalidRisks = uniqueRisks.filter((riskKey) => !riskIds.has(riskKey));
    for (const riskKey of invalidRisks) {
      issues.push({
        id: issueId('sceneIssue', 'invalidBusinessSceneRiskRef', key, riskKey),
        type: 'invalidBusinessSceneRiskRef',
        severity: 'error',
        entityType: 'businessScene',
        key,
        title: entity.title || '',
        ref: riskKey,
        message: `BusinessScene 引用了不存在的 Risk: ${riskKey}`,
      });
    }

    return issues;
  }).sort((a, b) => a.type.localeCompare(b.type) || a.key.localeCompare(b.key));
}

function collectI18nIssues() {
  return entityDirs.flatMap((config) => {
    const zhKeys = loadKeySet(config.zhDir);
    const enKeys = loadKeySet(config.enDir);
    const missing = [...zhKeys]
      .filter((key) => !enKeys.has(key))
      .map((key) => ({
        id: issueId('i18nIssue', 'missingEnglishEntity', config.type, key),
        type: 'missingEnglishEntity',
        severity: 'error',
        entityType: config.type,
        key,
        title: '',
        message: `${entityLabels[config.type]} 缺少英文翻译实体: ${key}`,
      }));
    const extra = [...enKeys]
      .filter((key) => !zhKeys.has(key))
      .map((key) => ({
        id: issueId('i18nIssue', 'extraEnglishEntity', config.type, key),
        type: 'extraEnglishEntity',
        severity: 'error',
        entityType: config.type,
        key,
        title: '',
        message: `${entityLabels[config.type]} 英文翻译存在多余实体: ${key}`,
      }));

    return [...missing, ...extra];
  }).sort((a, b) => a.entityType.localeCompare(b.entityType) || a.key.localeCompare(b.key));
}

function summarizeIssues(items) {
  const bySeverity = {};
  const byType = {};
  for (const item of items) {
    bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
    byType[item.type] = (byType[item.type] || 0) + 1;
  }
  return {
    total: items.length,
    bySeverity,
    byType,
  };
}

function summarizeReferenceHealth(report) {
  if (!report) {
    return {
      generatedAt: null,
      stale: true,
      stats: {},
      byIssue: {},
      byDomain: {},
    };
  }

  const byIssue = {};
  const byDomain = {};
  for (const item of report.results || []) {
    byIssue[item.issue] = (byIssue[item.issue] || 0) + 1;
    if (item.issue === 'ok') continue;
    const domain = item.domain || 'unknown';
    if (!byDomain[domain]) {
      byDomain[domain] = {
        total: 0,
        byIssue: {},
      };
    }
    byDomain[domain].total++;
    byDomain[domain].byIssue[item.issue] = (byDomain[domain].byIssue[item.issue] || 0) + 1;
  }

  return {
    generatedAt: report.generatedAt || null,
    stale: false,
    timeoutMs: report.timeoutMs,
    concurrency: report.concurrency,
    stats: report.stats || {},
    byIssue,
    byDomain: Object.fromEntries(Object.entries(byDomain).sort(([, a], [, b]) => b.total - a.total || 0)),
    domainGroups: report.domainGroups || [],
  };
}

function collectReferenceHealthIssues(report) {
  if (!report) {
    return [
      {
        id: issueId('referenceHealth', 'missingReport'),
        type: 'missingReferenceHealthReport',
        severity: 'review',
        entityType: 'reference',
        key: 'reference-health',
        title: '',
        message: '缺少引用健康报告，请先运行 npm run audit:references-health',
      },
    ];
  }

  return (report.results || [])
    .filter((item) => item.issue && item.issue !== 'ok')
    .sort(
      (a, b) =>
        String(a.issue).localeCompare(String(b.issue)) ||
        String(a.domain || '').localeCompare(String(b.domain || '')) ||
        String(a.link || '').localeCompare(String(b.link || '')),
    )
    .slice(0, maxEmbeddedIssueItems)
    .map((item) => {
      const firstRef = item.references?.[0] || {};
      const severity = item.issue === 'broken' ? 'error' : 'review';
      return {
        id: issueId('referenceHealth', item.issue, item.link),
        type: `reference_${item.issue}`,
        severity,
        entityType: firstRef.entityType || 'reference',
        key: firstRef.entityKey || item.domain || '',
        title: firstRef.entityTitle || '',
        link: item.link,
        domain: item.domain || '',
        status: item.status || 0,
        issue: item.issue,
        referenceCount: item.references?.length || 0,
        checkedAt: item.checkedAt || report.generatedAt || '',
        message: `引用链接需要复核: ${item.issue} ${item.link}`,
      };
    });
}

function summarizeCaseSourceQuality(report) {
  if (!report) {
    return {
      generatedAt: null,
      stale: true,
      stats: {},
      statsByCategory: {},
      highValueCategories: [],
    };
  }

  return {
    generatedAt: report.generatedAt || null,
    stale: false,
    stats: report.stats || {},
    statsByCategory: report.statsByCategory || {},
    highValueCategories: report.highValueCategories || [],
  };
}

function collectCaseSourceIssues(report) {
  if (!report) {
    return [
      {
        id: issueId('caseSource', 'missingReport'),
        type: 'missingCaseSourceQualityReport',
        severity: 'review',
        entityType: 'case',
        key: 'case-source-quality',
        title: '',
        message: '缺少案例来源质量报告，请先运行 npm run audit:case-source-quality',
      },
    ];
  }

  const issueConfigs = [
    { key: 'highValueMissingPrimary', type: 'highValueMissingPrimary', severity: 'review' },
    { key: 'weakSource', type: 'weakSource', severity: 'review' },
    { key: 'unknownOnly', type: 'unknownOnly', severity: 'review' },
    { key: 'secondaryOnly', type: 'secondaryOnly', severity: 'info' },
  ];

  const items = [];
  for (const config of issueConfigs) {
    for (const item of report.issues?.[config.key] || []) {
      items.push({
        id: issueId('caseSource', config.type, item.key),
        type: config.type,
        severity: config.severity,
        entityType: 'case',
        key: item.key,
        title: item.title || '',
        category: item.category || '',
        file: item.file || '',
        strongestSourceType: item.strongestSourceType || '',
        sourceTypes: item.sourceTypes || [],
        qualityFlags: item.qualityFlags || [],
        referenceDomains: (item.references || []).map((ref) => ref.domain || 'unknown'),
        message: `Case 来源质量需要复核: ${config.type} ${item.key}`,
      });
    }
  }

  const typeOrder = {
    highValueMissingPrimary: 0,
    weakSource: 1,
    unknownOnly: 2,
    secondaryOnly: 3,
  };

  return items
    .sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99) || a.key.localeCompare(b.key))
    .slice(0, maxEmbeddedIssueItems);
}

export function buildQualityReport({ generatedAt = new Date().toISOString() } = {}) {
  const collections = {
    risks: loadEntities('risks'),
    avoidances: loadEntities('avoidances'),
    attackTools: loadEntities('attack-tools'),
    threatActors: loadEntities('threat-actors'),
    businessScenes: loadJsonRecords('src/BREAK/business-scenes'),
  };
  const riskIds = new Set(collections.risks.map(({ key }) => key));
  const weakRelations = collectWeakRelations(collections);
  const missingCoverage = collectMissingCoverage(collections);
  const sceneIssues = collectSceneIssues(collections.businessScenes, riskIds);
  const i18nIssues = collectI18nIssues();
  const referenceHealthReport = readOptionalJson(referenceHealthReportPath);
  const caseSourceQualityReport = readOptionalJson(caseSourceQualityReportPath);
  const referenceHealthIssues = collectReferenceHealthIssues(referenceHealthReport);
  const caseSourceIssues = collectCaseSourceIssues(caseSourceQualityReport);

  return {
    schemaVersion: 1,
    generatedAt,
    embeddedIssueLimit: maxEmbeddedIssueItems,
    sourceReports: {
      referenceHealth: summarizeReferenceHealth(referenceHealthReport),
      caseSourceQuality: summarizeCaseSourceQuality(caseSourceQualityReport),
    },
    weakRelations,
    missingCoverage,
    sceneIssues,
    i18nIssues,
    referenceHealthIssues,
    caseSourceIssues,
    summary: {
      weakRelations: summarizeIssues(weakRelations),
      missingCoverage: summarizeIssues(missingCoverage),
      sceneIssues: summarizeIssues(sceneIssues),
      i18nIssues: summarizeIssues(i18nIssues),
      referenceHealthIssues: summarizeIssues(referenceHealthIssues),
      caseSourceIssues: summarizeIssues(caseSourceIssues),
    },
  };
}

export function writeQualityReport({ generatedAt, publicPath = publicReportPath, mirrorResearchReport = true } = {}) {
  const report = buildQualityReport({ generatedAt });
  ensureDir(path.dirname(publicPath));
  writeJson(publicPath, report);
  if (mirrorResearchReport) {
    ensureDir(path.dirname(researchReportPath));
    writeJson(researchReportPath, report);
  }
  return report;
}

const isCli = fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const report = writeQualityReport();
  console.log('\n✅ 质量报告已生成');
  console.log(`weakRelations=${report.weakRelations.length}`);
  console.log(`missingCoverage=${report.missingCoverage.length}`);
  console.log(`sceneIssues=${report.sceneIssues.length}`);
  console.log(`i18nIssues=${report.i18nIssues.length}`);
  console.log(`referenceHealthIssues=${report.referenceHealthIssues.length}`);
  console.log(`caseSourceIssues=${report.caseSourceIssues.length}`);
  console.log(`report=${path.relative(projectRoot, publicReportPath)}`);
}
