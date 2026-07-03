import fs from "fs";
import path from "path";
import { domainOf, loadEntities, projectRoot, writeJson } from "../search/common.mjs";
import {
  highValueCategories,
  classifySource,
  strongestSourceType,
} from "./source-classify.mjs";

const reportDir = path.join(projectRoot, "research/search-reports");

function buildReport() {
  const cases = loadEntities('cases');
  const caseReports = [];
  const statsByCategory = {};
  const stats = {
    caseCount: cases.length,
    highValueCaseCount: 0,
    primaryCoveredCases: 0,
    highValuePrimaryCoveredCases: 0,
    secondaryOnlyCases: 0,
    weakSourceCases: 0,
    unknownOnlyCases: 0,
  };

  for (const { key, filePath, entity } of cases) {
    const category = entity.category || 'unknown';
    const isHighValue = highValueCategories.has(category);
    const classifiedReferences = (entity.references || []).map((ref, index) => ({
      index,
      title: ref.title || '',
      link: ref.link || '',
      domain: domainOf(ref.link),
      ...classifySource(ref),
    }));
    const sourceTypes = [...new Set(classifiedReferences.map((ref) => ref.sourceType))];
    const strongest = strongestSourceType(sourceTypes);
    const hasPrimary = sourceTypes.includes('primary');
    const hasWeak = sourceTypes.includes('weak');
    const isSecondaryOnly = sourceTypes.length === 1 && sourceTypes[0] === 'secondary';
    const isUnknownOnly = sourceTypes.length === 1 && sourceTypes[0] === 'unknown';

    if (!statsByCategory[category]) {
      statsByCategory[category] = {
        total: 0,
        primaryCovered: 0,
        secondaryOnly: 0,
        weakSource: 0,
        unknownOnly: 0,
      };
    }
    statsByCategory[category].total++;
    if (isHighValue) stats.highValueCaseCount++;
    if (hasPrimary) {
      stats.primaryCoveredCases++;
      statsByCategory[category].primaryCovered++;
      if (isHighValue) stats.highValuePrimaryCoveredCases++;
    }
    if (isSecondaryOnly) {
      stats.secondaryOnlyCases++;
      statsByCategory[category].secondaryOnly++;
    }
    if (hasWeak) {
      stats.weakSourceCases++;
      statsByCategory[category].weakSource++;
    }
    if (isUnknownOnly) {
      stats.unknownOnlyCases++;
      statsByCategory[category].unknownOnly++;
    }

    caseReports.push({
      key,
      title: entity.title || '',
      category,
      file: path.relative(projectRoot, filePath),
      isHighValue,
      strongestSourceType: strongest,
      hasPrimary,
      sourceTypes,
      qualityFlags: [
        ...(isHighValue && !hasPrimary ? ['high_value_missing_primary'] : []),
        ...(isSecondaryOnly ? ['secondary_only'] : []),
        ...(hasWeak ? ['weak_source'] : []),
        ...(isUnknownOnly ? ['unknown_only'] : []),
      ],
      references: classifiedReferences,
    });
  }

  stats.primaryCoverageRate = stats.caseCount
    ? Number(((stats.primaryCoveredCases / stats.caseCount) * 100).toFixed(2))
    : 0;
  stats.highValuePrimaryCoverageRate = stats.highValueCaseCount
    ? Number(((stats.highValuePrimaryCoveredCases / stats.highValueCaseCount) * 100).toFixed(2))
    : 0;

  for (const stat of Object.values(statsByCategory)) {
    stat.primaryCoverageRate = stat.total ? Number(((stat.primaryCovered / stat.total) * 100).toFixed(2)) : 0;
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceTypeDefinitions: {
      primary: '官方、原始或高稳定来源，例如法院/监管/公安/厂商公告、论文、CVE/NVD、原始代码仓库。',
      secondary: '可信媒体或安全厂商分析，可用于佐证但不等同原始证据。',
      mirror: '转载、社交平台或备份入口，适合作为补充，不宜作为唯一高价值证据。',
      weak: '低可信、用户生成或易失来源，需优先替换或补 primary。',
      unknown: '当前规则无法可靠判定，需人工复核或扩充域名规则。',
    },
    highValueCategories: [...highValueCategories],
    stats,
    statsByCategory,
    cases: caseReports,
    issues: {
      highValueMissingPrimary: caseReports.filter((item) => item.qualityFlags.includes('high_value_missing_primary')),
      secondaryOnly: caseReports.filter((item) => item.qualityFlags.includes('secondary_only')),
      weakSource: caseReports.filter((item) => item.qualityFlags.includes('weak_source')),
      unknownOnly: caseReports.filter((item) => item.qualityFlags.includes('unknown_only')),
    },
  };
}

function renderReport(report) {
  const lines = [
    '# BREAK 案例来源质量审计报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 汇总',
    '',
    '| 指标 | 数量 |',
    '| --- | ---: |',
  ];

  for (const [key, value] of Object.entries(report.stats)) {
    lines.push(`| ${key} | ${value} |`);
  }

  lines.push('', '## 按案例类别统计', '');
  lines.push('| category | total | primaryCovered | primaryCoverageRate | secondaryOnly | weakSource | unknownOnly |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const [category, stat] of Object.entries(report.statsByCategory)) {
    lines.push(
      `| ${category} | ${stat.total} | ${stat.primaryCovered} | ${stat.primaryCoverageRate}% | ${stat.secondaryOnly} | ${stat.weakSource} | ${stat.unknownOnly} |`,
    );
  }

  const sections = [
    ['高价值但缺 primary 来源 Top 50', report.issues.highValueMissingPrimary],
    ['仅 secondary 来源 Top 50', report.issues.secondaryOnly],
    ['包含 weak 来源 Top 50', report.issues.weakSource],
    ['仅 unknown 来源 Top 50', report.issues.unknownOnly],
  ];

  for (const [title, items] of sections) {
    lines.push('', `## ${title}`, '');
    if (!items.length) {
      lines.push('无。');
      continue;
    }
    for (const item of items.slice(0, 50)) {
      const refs = item.references
        .map((ref) => `${ref.sourceType}:${ref.domain || 'unknown'}`)
        .join(', ');
      lines.push(`- ${item.key} ${item.title} [${item.category}] (${refs})`);
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'case-source-quality.json'), report);
fs.writeFileSync(path.join(reportDir, 'case-source-quality.md'), renderReport(report));

console.log('\n=== BREAK 案例来源质量审计 ===\n');
for (const [key, value] of Object.entries(report.stats)) {
  console.log(`${key}: ${value}`);
}
console.log(`\n报告已保存到: ${path.join(reportDir, 'case-source-quality.md')}`);
