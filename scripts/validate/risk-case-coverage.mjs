import path from 'node:path';
import fs from 'node:fs';
import { ensureDir, loadEntities, projectRoot, readJson, writeJson } from '../search/common.mjs';

const reportDir = path.join(projectRoot, 'research/search-reports');
const reportJsonPath = path.join(reportDir, 'risk-case-coverage.json');
const reportMdPath = path.join(reportDir, 'risk-case-coverage.md');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const maxRows = Number.parseInt(limitArg?.split('=')[1] || '120', 10);

if (!Number.isInteger(maxRows) || maxRows < 1) {
  console.error('[risk-case-coverage] --limit 必须是正整数');
  process.exit(1);
}

const complexityWeight = {
  advanced: 3,
  intermediate: 2,
  basic: 1,
};

const percent = (part, total) => (total ? Number(((part / total) * 100).toFixed(2)) : 0);
const isSubRisk = (key) => key.includes('-');
const unique = (values) => [...new Set(values.filter(Boolean))].sort();

function collectRiskScenes() {
  const sceneMap = new Map();
  const businessScenesDir = path.join(projectRoot, 'src/BREAK/business-scenes');

  for (const file of fs.readdirSync(businessScenesDir).filter((item) => item.endsWith('.json')).sort()) {
    const data = readJson(path.join(businessScenesDir, file));
    for (const [businessSceneKey, businessScene] of Object.entries(data)) {
      const businessSceneTitle = businessScene.title || businessSceneKey;
      for (const [riskSceneKey, riskScene] of Object.entries(businessScene.riskScenes || {})) {
        const risks = Array.isArray(riskScene.risks) ? riskScene.risks : [];
        for (const riskKey of risks) {
          const current = sceneMap.get(riskKey) || [];
          current.push({
            businessSceneKey,
            businessSceneTitle,
            riskSceneKey,
            riskSceneTitle: riskScene.title || riskSceneKey,
          });
          sceneMap.set(riskKey, current);
        }
      }
    }
  }

  return sceneMap;
}

function collectRiskCaseMap() {
  const riskCases = new Map();

  for (const { key: caseKey, entity } of loadEntities('cases')) {
    const relatedRisks = Array.isArray(entity.relatedRisks) ? entity.relatedRisks : [];
    for (const riskKey of new Set(relatedRisks)) {
      const current = riskCases.get(riskKey) || [];
      current.push({
        key: caseKey,
        title: entity.title || '',
        category: entity.category || '',
        incidentTime: entity.incidentTime || '',
      });
      riskCases.set(riskKey, current);
    }
  }

  return riskCases;
}

function summarizeByComplexity(risks) {
  const complexities = unique(risks.map((risk) => risk.complexity || 'unknown'));
  return complexities.map((complexity) => {
    const scoped = risks.filter((risk) => (risk.complexity || 'unknown') === complexity);
    const covered = scoped.filter((risk) => risk.caseCount > 0).length;
    return {
      complexity,
      total: scoped.length,
      covered,
      uncovered: scoped.length - covered,
      coverageRate: percent(covered, scoped.length),
    };
  });
}

function buildReport() {
  const riskCaseMap = collectRiskCaseMap();
  const riskSceneMap = collectRiskScenes();
  const risks = loadEntities('risks')
    .map(({ key, entity, filePath }) => {
      const cases = riskCaseMap.get(key) || [];
      const scenes = riskSceneMap.get(key) || [];
      return {
        key,
        title: entity.title || '',
        complexity: entity.complexity || 'unknown',
        updated: entity.updated || '',
        isSubRisk: isSubRisk(key),
        filePath: path.relative(projectRoot, filePath),
        caseCount: cases.length,
        cases: cases.sort((a, b) => a.key.localeCompare(b.key)),
        businessScenes: unique(scenes.map((scene) => scene.businessSceneKey)),
        riskScenes: scenes.map((scene) => ({
          key: scene.riskSceneKey,
          title: scene.riskSceneTitle,
          businessSceneKey: scene.businessSceneKey,
          businessSceneTitle: scene.businessSceneTitle,
        })),
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  const covered = risks.filter((risk) => risk.caseCount > 0);
  const uncovered = risks
    .filter((risk) => risk.caseCount === 0)
    .sort((a, b) => {
      const weightDiff =
        (complexityWeight[b.complexity] || 0) - (complexityWeight[a.complexity] || 0);
      if (weightDiff) return weightDiff;
      if (a.isSubRisk !== b.isSubRisk) return a.isSubRisk ? 1 : -1;
      return (a.updated || '9999-99-99').localeCompare(b.updated || '9999-99-99') || a.key.localeCompare(b.key);
    });

  const mainRisks = risks.filter((risk) => !risk.isSubRisk);
  const subRisks = risks.filter((risk) => risk.isSubRisk);

  return {
    generatedAt: new Date().toISOString(),
    policy: 'Risk 建议至少有 1 个高质量 Case，但该覆盖率仅作为非阻断成熟度指标。',
    summary: {
      totalRisks: risks.length,
      coveredRisks: covered.length,
      uncoveredRisks: uncovered.length,
      coverageRate: percent(covered.length, risks.length),
      mainRisks: mainRisks.length,
      coveredMainRisks: mainRisks.filter((risk) => risk.caseCount > 0).length,
      mainCoverageRate: percent(
        mainRisks.filter((risk) => risk.caseCount > 0).length,
        mainRisks.length,
      ),
      subRisks: subRisks.length,
      coveredSubRisks: subRisks.filter((risk) => risk.caseCount > 0).length,
      subCoverageRate: percent(
        subRisks.filter((risk) => risk.caseCount > 0).length,
        subRisks.length,
      ),
    },
    byComplexity: summarizeByComplexity(risks),
    uncoveredRisks: uncovered,
    risks,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Risk-Case 覆盖审计',
    '',
    `生成时间：${report.generatedAt}`,
    '',
    report.policy,
    '',
    '## 总览',
    '',
    `- Risk 总数：${report.summary.totalRisks}`,
    `- 已有关联 Case：${report.summary.coveredRisks}`,
    `- 暂无关联 Case：${report.summary.uncoveredRisks}`,
    `- 覆盖率：${report.summary.coverageRate}%`,
    `- 父风险覆盖率：${report.summary.coveredMainRisks}/${report.summary.mainRisks}（${report.summary.mainCoverageRate}%）`,
    `- 子风险覆盖率：${report.summary.coveredSubRisks}/${report.summary.subRisks}（${report.summary.subCoverageRate}%）`,
    '',
    '## 按复杂度',
    '',
    '| complexity | total | covered | uncovered | coverageRate |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...report.byComplexity.map(
      (item) =>
        `| ${item.complexity} | ${item.total} | ${item.covered} | ${item.uncovered} | ${item.coverageRate}% |`,
    ),
    '',
    `## 暂无 Case 的 Risk（前 ${Math.min(maxRows, report.uncoveredRisks.length)} 条）`,
    '',
    '| Risk | 标题 | complexity | updated | 业务场景 |',
    '| --- | --- | --- | --- | --- |',
    ...report.uncoveredRisks.slice(0, maxRows).map((risk) => {
      const scenes = risk.riskScenes
        .map((scene) => `${scene.businessSceneKey}/${scene.key}`)
        .join(', ');
      return `| ${risk.key} | ${risk.title} | ${risk.complexity} | ${risk.updated || '-'} | ${scenes || '-'} |`;
    }),
  ];

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
ensureDir(reportDir);
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, renderMarkdown(report));

console.log('[risk-case-coverage] 非阻断审计完成');
console.log(
  `[risk-case-coverage] 覆盖率 ${report.summary.coverageRate}%：${report.summary.coveredRisks}/${report.summary.totalRisks} 个 Risk 已有关联 Case`,
);
console.log(`[risk-case-coverage] 暂无关联 Case 的 Risk：${report.summary.uncoveredRisks}`);
console.log(`[risk-case-coverage] 报告：${path.relative(projectRoot, reportMdPath)}`);
