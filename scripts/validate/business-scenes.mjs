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
const reportJsonPath = path.join(reportDir, 'business-scene-audit.json');
const reportMdPath = path.join(reportDir, 'business-scene-audit.md');

const strict = process.argv.includes('--strict');

const defaultCrossSceneReason = {
  R0020: '内容合规风险同时具备内容治理与法规合规属性。',
  R0046: '未成年人识别绕过同时影响身份识别与未成年人保护合规。',
  R0060: '洗钱风险既影响支付链路，也会借助商家/商户经营链路落地。',
  R0071: '生成式AI风险兼具内容生态与业务合规属性。',
  'R0071-002': 'AIGC合规风险在多个行业均作为行业监管专题复用。',
  R0097: '借助平台赌博既是合规问题，也是内容/生态治理问题。',
  R0110: '平台色情风险同时影响内容治理与行业合规。',
  R0115: '恶意广告投放同时影响内容生态与合规治理。',
  R0124: '未成年人保护合规风险在多个行业作为专题复用。',
  R0133: '隐私计算滥用风险在人工智能和行业合规中均需单列。',
};

function loadBusinessScenes() {
  const dir = path.join(projectRoot, 'src/BREAK/business-scenes');
  const records = [];
  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json')).sort()) {
    const data = readJson(path.join(dir, file));
    for (const [key, entity] of Object.entries(data)) {
      records.push({ key, entity, file });
    }
  }
  return records;
}

function addIssue(issues, severity, type, message, details = {}) {
  issues.push({ severity, type, message, ...details });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizeSceneRef(sceneKey, sceneTitle, dimensionTitle) {
  return {
    sceneKey,
    sceneTitle: sceneTitle || sceneKey,
    dimensionTitle: dimensionTitle || '',
  };
}

function parentRiskId(riskId) {
  return riskId.includes('-') ? riskId.split('-')[0] : '';
}

function uniqueBy(values, keyFn) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = keyFn(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function inferCrossSceneReason(riskId, sceneRefs, referencedInRiskScenes) {
  const uniqueRefs = uniqueBy(
    sceneRefs,
    (item) => `${item.businessSceneKey}/${item.sceneKey}`,
  );
  const uniqueBusinessScenes = unique(uniqueRefs.map((item) => item.businessSceneKey));
  const uniqueSceneTitles = unique(uniqueRefs.map((item) => item.sceneTitle));
  const uniqueDimensionTitles = unique(uniqueRefs.map((item) => item.dimensionTitle));

  if (uniqueSceneTitles.length === 1 && uniqueBusinessScenes.length > 1) {
    return `同一风险场景“${uniqueSceneTitles[0]}”在多个行业复用。`;
  }

  const parentId = parentRiskId(riskId);
  if (parentId) {
    const parentRefs = referencedInRiskScenes.get(parentId) || [];
    const parentPairs = new Set(
      parentRefs.map((item) => `${item.businessSceneKey}/${item.sceneKey}`),
    );
    if (
      parentPairs.size > 0 &&
      uniqueRefs.every((item) => parentPairs.has(`${item.businessSceneKey}/${item.sceneKey}`))
    ) {
      return `子风险继承父风险 ${parentId} 的业务场景归类。`;
    }
  }

  if (uniqueDimensionTitles.length === 1 && uniqueBusinessScenes.length > 1) {
    return `同一${uniqueDimensionTitles[0]}风险在多个行业复用。`;
  }

  if (uniqueBusinessScenes.includes('BS00') && uniqueBusinessScenes.length > 1) {
    return '全场景通用风险与行业专题场景并行复用。';
  }

  return '';
}

function collectSceneIndex(sceneEntity) {
  const dimensionByScene = new Map();
  for (const dimension of Object.values(sceneEntity.riskDimensions || {})) {
    for (const sceneKey of dimension.riskScenes || []) {
      dimensionByScene.set(
        sceneKey,
        normalizeSceneRef(sceneKey, sceneEntity.riskScenes?.[sceneKey]?.title, dimension.title),
      );
    }
  }
  return dimensionByScene;
}

function collectAudit() {
  const risks = loadEntities('risks');
  const riskTitleById = new Map(risks.map(({ key, entity }) => [key, entity.title || '']));
  const riskIds = new Set(risks.map(({ key }) => key));
  const businessScenes = loadBusinessScenes();
  const issues = [];
  const referencedInRiskScenes = new Map();
  const referencedAtTopLevel = new Map();
  const crossSceneReasons = new Map(Object.entries(defaultCrossSceneReason));
  const inferredCrossSceneReasons = new Map();

  for (const { key: businessSceneKey, entity } of businessScenes) {
    const dimensionByScene = collectSceneIndex(entity);

    for (const [sceneKey, scene] of Object.entries(entity.riskScenes || {})) {
      const sceneRef = dimensionByScene.get(sceneKey) || normalizeSceneRef(sceneKey, scene.title, '');
      for (const riskId of scene.risks || []) {
        if (!referencedInRiskScenes.has(riskId)) referencedInRiskScenes.set(riskId, []);
        referencedInRiskScenes.get(riskId).push({
          businessSceneKey,
          businessSceneTitle: entity.title || businessSceneKey,
          ...sceneRef,
        });
      }
    }

    for (const riskId of entity.risks || []) {
      if (!referencedAtTopLevel.has(riskId)) referencedAtTopLevel.set(riskId, []);
      referencedAtTopLevel.get(riskId).push({
        businessSceneKey,
        businessSceneTitle: entity.title || businessSceneKey,
      });
    }
  }

  for (const riskId of riskIds) {
    const sceneRefs = referencedInRiskScenes.get(riskId) || [];
    const topRefs = referencedAtTopLevel.get(riskId) || [];

    if (sceneRefs.length === 0 && topRefs.length === 0) {
      addIssue(
        issues,
        'error',
        'risk_without_business_scene',
        `Risk 未被任何 BusinessScene 覆盖: ${riskId}`,
        { key: riskId, title: riskTitleById.get(riskId) || '' },
      );
      continue;
    }

    if (sceneRefs.length === 0 && topRefs.length > 0) {
      addIssue(
        issues,
        strict ? 'error' : 'review',
        'risk_without_primary_scene',
        `Risk 缺少主场景，仅存在于顶层 risks: ${riskId}`,
        {
          key: riskId,
          title: riskTitleById.get(riskId) || '',
          businessScenes: topRefs.map((item) => item.businessSceneKey),
        },
      );
    }

    const scenePairs = unique(
      sceneRefs.map((item) => `${item.businessSceneKey}/${item.sceneKey}`),
    );
    if (scenePairs.length > 1 && !crossSceneReasons.has(riskId)) {
      const inferredReason = inferCrossSceneReason(riskId, sceneRefs, referencedInRiskScenes);
      if (inferredReason) {
        inferredCrossSceneReasons.set(riskId, inferredReason);
      } else {
        addIssue(
          issues,
          strict ? 'error' : 'review',
          'cross_scene_without_reason',
          `Risk 跨挂多个场景但缺少明确理由: ${riskId}`,
          {
            key: riskId,
            title: riskTitleById.get(riskId) || '',
            references: sceneRefs.map(
              (item) =>
                `${item.businessSceneTitle}/${item.dimensionTitle || '未分类维度'}/${item.sceneTitle}`,
            ),
          },
        );
      }
    }
  }

  for (const [riskId, topRefs] of referencedAtTopLevel.entries()) {
    const sceneRefs = referencedInRiskScenes.get(riskId) || [];
    if (sceneRefs.length > 0) {
      addIssue(
        issues,
        strict ? 'error' : 'review',
        'top_level_risk_duplicate',
        `顶层 risks 不应重复收录已分配主场景的 Risk: ${riskId}`,
        {
          key: riskId,
          title: riskTitleById.get(riskId) || '',
          businessScenes: topRefs.map((item) => item.businessSceneKey),
        },
      );
    } else {
      addIssue(
        issues,
        'review',
        'top_level_risk_unassigned',
        `顶层 risks 存在未分配专题 Risk，应尽快清零: ${riskId}`,
        {
          key: riskId,
          title: riskTitleById.get(riskId) || '',
          businessScenes: topRefs.map((item) => item.businessSceneKey),
        },
      );
    }
  }

  for (const { key: businessSceneKey, entity } of businessScenes) {
    const topLevel = entity.risks || [];
    const duplicated = topLevel.filter((riskId) => (referencedInRiskScenes.get(riskId) || []).length > 0);
    if (duplicated.length > 0) {
      addIssue(
        issues,
        strict ? 'error' : 'review',
        'business_scene_top_level_duplicates',
        `BusinessScene 顶层 risks 存在重复收录: ${businessSceneKey}`,
        {
          key: businessSceneKey,
          title: entity.title || '',
          risks: duplicated,
        },
      );
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      risks: risks.length,
      coveredByPrimaryScene: [...riskIds].filter(
        (riskId) => (referencedInRiskScenes.get(riskId) || []).length > 0,
      ).length,
      topLevelOnly: [...riskIds].filter(
        (riskId) =>
          (referencedInRiskScenes.get(riskId) || []).length === 0 &&
          (referencedAtTopLevel.get(riskId) || []).length > 0,
      ).length,
      crossSceneWithoutReason: issues.filter((item) => item.type === 'cross_scene_without_reason').length,
      topLevelDuplicates: issues.filter((item) => item.type === 'top_level_risk_duplicate').length,
    },
    crossSceneReasonCount: crossSceneReasons.size + inferredCrossSceneReasons.size,
    crossSceneReasons: Object.fromEntries([
      ...crossSceneReasons.entries(),
      ...inferredCrossSceneReasons.entries(),
    ].sort(([a], [b]) => a.localeCompare(b))),
    issues,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK 业务场景归类审计报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 规则',
    '',
    '1. 一个风险至少有一个主场景',
    '2. 跨挂必须有明确理由',
    '3. 顶层 risks 只保留未分配专题风险，并尽快清零',
    '',
    '## 摘要',
    '',
    `- 风险总数: ${report.summary.risks}`,
    `- 已有主场景的风险: ${report.summary.coveredByPrimaryScene}`,
    `- 仅存在于顶层 risks 的风险: ${report.summary.topLevelOnly}`,
    `- 缺少跨挂理由的风险: ${report.summary.crossSceneWithoutReason}`,
    `- 顶层重复收录风险: ${report.summary.topLevelDuplicates}`,
    `- 预置跨挂理由数: ${report.crossSceneReasonCount}`,
    '',
    '## 问题汇总',
    '',
  ];

  const severities = ['error', 'review', 'info'];
  for (const severity of severities) {
    lines.push(`- ${severity}: ${report.issues.filter((issue) => issue.severity === severity).length}`);
  }

  lines.push('', '## 问题详情', '');
  if (report.issues.length === 0) {
    lines.push('未发现业务场景归类问题。');
  } else {
    for (const issue of report.issues.slice(0, 150)) {
      lines.push(`- [${issue.severity}] \`${issue.type}\` ${issue.message}`);
      if (issue.title) lines.push(`  - title: ${issue.title}`);
      if (issue.references?.length) lines.push(`  - refs: ${issue.references.join(' | ')}`);
      if (issue.businessScenes?.length) lines.push(`  - businessScenes: ${issue.businessScenes.join(', ')}`);
      if (issue.risks?.length) lines.push(`  - risks: ${issue.risks.join(', ')}`);
    }
    if (report.issues.length > 150) {
      lines.push(`- 另有 ${report.issues.length - 150} 条未显示，请查看 JSON 报告。`);
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = collectAudit();
ensureDir(reportDir);
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, renderMarkdown(report));

console.log('\n=== BREAK 业务场景归类审计报告 ===\n');
console.log(`risks=${report.summary.risks}`);
console.log(`coveredByPrimaryScene=${report.summary.coveredByPrimaryScene}`);
console.log(`topLevelOnly=${report.summary.topLevelOnly}`);
console.log(`crossSceneWithoutReason=${report.summary.crossSceneWithoutReason}`);
console.log(`topLevelDuplicates=${report.summary.topLevelDuplicates}`);
console.log(`report=${reportMdPath}`);

if (strict && report.issues.some((issue) => issue.severity === 'error')) {
  process.exitCode = 1;
}
