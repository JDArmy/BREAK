import fs from 'fs';
import path from 'path';
import {
  domainOf,
  getDataFilePath,
  loadEntities,
  normalizeLink,
  projectRoot,
  readJson,
  safeUrl,
  writeJson,
} from '../search/common.mjs';

const entityTypes = ['risks', 'avoidances', 'attack-tools', 'threat-actors'];
const lowQualityDomains = [
  'baike.baidu.com',
  'baijiahao.baidu.com',
  'blog.csdn.net',
  'csdn.net',
  'jianshu.com',
  'zhuanlan.zhihu.com',
];

function severityForIssue(type) {
  if (['duplicate_link', 'low_quality_domain'].includes(type)) return 'warning';
  if (['i18n_reference_count_mismatch', 'i18n_reference_link_mismatch'].includes(type)) return 'review';
  return 'error';
}

function addIssue(issues, issue) {
  issues.push({
    severity: issue.severity || severityForIssue(issue.type),
    ...issue,
  });
}

function validateReferenceShape(ref, index, context, issues) {
  if (!ref || typeof ref !== 'object') {
    addIssue(issues, { type: 'invalid_reference', ...context, refIndex: index });
    return;
  }

  if (!String(ref.title || '').trim()) {
    addIssue(issues, { type: 'missing_title', ...context, refIndex: index, link: ref.link || '' });
  }

  const link = normalizeLink(ref.link);
  if (!link) {
    addIssue(issues, { type: 'empty_link', ...context, refIndex: index, refTitle: ref.title || '' });
    return;
  }

  const url = safeUrl(link);
  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    addIssue(issues, { type: 'invalid_url', ...context, refIndex: index, link });
  }
}

function checkEntityReferences(entityType, records, issues) {
  for (const { key, entity } of records) {
    const context = {
      entityType,
      entityKey: key,
      entityTitle: entity.title || '',
    };

    if (!Array.isArray(entity.references) || entity.references.length === 0) {
      addIssue(issues, { type: 'missing_references', ...context });
      continue;
    }

    const seen = new Map();
    for (const [index, ref] of entity.references.entries()) {
      validateReferenceShape(ref, index, context, issues);

      const link = normalizeLink(ref?.link).toLowerCase();
      if (!link) continue;

      if (seen.has(link)) {
        addIssue(issues, {
          type: 'duplicate_link',
          ...context,
          link: ref.link,
          indices: [seen.get(link), index],
        });
      } else {
        seen.set(link, index);
      }

      const domain = domainOf(link);
      const matchedLowQualityDomain = lowQualityDomains.find((item) => domain.endsWith(item));
      if (matchedLowQualityDomain) {
        addIssue(issues, {
          type: 'low_quality_domain',
          ...context,
          refIndex: index,
          link: ref.link,
          domain,
        });
      }
    }
  }
}

function checkI18nSync(entityType, zhRecords, issues) {
  for (const { key, entity: zhEntity } of zhRecords) {
    const enPath = getDataFilePath(entityType, key, 'en');
    if (!fs.existsSync(enPath)) {
      addIssue(issues, {
        type: 'missing_i18n_file',
        entityType,
        entityKey: key,
        entityTitle: zhEntity.title || '',
        path: path.relative(projectRoot, enPath),
      });
      continue;
    }

    const enData = readJson(enPath);
    const enEntity = enData[key];
    if (!enEntity) {
      addIssue(issues, {
        type: 'missing_i18n_entity',
        entityType,
        entityKey: key,
        entityTitle: zhEntity.title || '',
        path: path.relative(projectRoot, enPath),
      });
      continue;
    }

    const zhRefs = Array.isArray(zhEntity.references) ? zhEntity.references : [];
    const enRefs = Array.isArray(enEntity.references) ? enEntity.references : [];
    if (zhRefs.length !== enRefs.length) {
      addIssue(issues, {
        type: 'i18n_reference_count_mismatch',
        entityType,
        entityKey: key,
        entityTitle: zhEntity.title || '',
        zhCount: zhRefs.length,
        enCount: enRefs.length,
      });
      continue;
    }

    zhRefs.forEach((zhRef, index) => {
      const zhLink = normalizeLink(zhRef.link);
      const enLink = normalizeLink(enRefs[index]?.link);
      if (zhLink !== enLink) {
        addIssue(issues, {
          type: 'i18n_reference_link_mismatch',
          entityType,
          entityKey: key,
          entityTitle: zhEntity.title || '',
          refIndex: index,
          zhLink,
          enLink,
        });
      }
    });
  }
}

function buildStats(entityType, records) {
  const total = records.length;
  const withReferences = records.filter(({ entity }) => entity.references?.length > 0).length;
  const references = records.flatMap(({ entity }) => entity.references || []);
  const lowQuality = references.filter((ref) =>
    lowQualityDomains.some((domain) => domainOf(ref.link).endsWith(domain)),
  ).length;

  return {
    type: entityType,
    total,
    withReferences,
    missingReferences: total - withReferences,
    references: references.length,
    lowQuality,
    lowQualityRate: references.length ? Number(((lowQuality / references.length) * 100).toFixed(2)) : 0,
    coverageRate: total ? Number(((withReferences / total) * 100).toFixed(2)) : 0,
  };
}

function renderMarkdown(stats, issues) {
  const lines = [
    '# BREAK 参考资料基线审计报告',
    '',
    `生成时间: ${new Date().toISOString()}`,
    '',
    '## 实体统计',
    '',
    '| 类别 | 实体数 | 有引用 | 缺少引用 | 引用数 | 低质量来源占比 | 覆盖率 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const item of stats) {
    lines.push(
      `| ${item.type} | ${item.total} | ${item.withReferences} | ${item.missingReferences} | ${item.references} | ${item.lowQualityRate}% | ${item.coverageRate}% |`,
    );
  }

  lines.push('', '## 问题汇总', '');
  const byType = Map.groupBy ? Map.groupBy(issues, (issue) => issue.type) : null;
  const issueTypes = [...new Set(issues.map((issue) => issue.type))].sort();
  if (issueTypes.length === 0) {
    lines.push('未发现结构性问题。');
  } else {
    const severities = [...new Set(issues.map((issue) => issue.severity))].sort();
    for (const severity of severities) {
      lines.push(`- ${severity}: ${issues.filter((issue) => issue.severity === severity).length}`);
    }
    lines.push('');
    for (const type of issueTypes) {
      const count = byType ? byType.get(type).length : issues.filter((issue) => issue.type === type).length;
      lines.push(`- ${type}: ${count}`);
    }
  }

  lines.push('', '## 问题详情', '');
  for (const issue of issues) {
    lines.push(
      `- [${issue.severity}] \`${issue.type}\` [${issue.entityType}] ${issue.entityKey || ''} ${issue.entityTitle || ''}`.trim(),
    );
    if (issue.link || issue.zhLink || issue.enLink) {
      lines.push(`  - link: ${issue.link || `${issue.zhLink || '(empty)'} -> ${issue.enLink || '(empty)'}`}`);
    }
    if (issue.domain) {
      lines.push(`  - domain: ${issue.domain}`);
    }
    if (issue.zhCount !== undefined) {
      lines.push(`  - references: zh=${issue.zhCount}, en=${issue.enCount}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const issues = [];
  const stats = [];

  for (const entityType of entityTypes) {
    const records = loadEntities(entityType);
    stats.push(buildStats(entityType, records));
    checkEntityReferences(entityType, records, issues);
    checkI18nSync(entityType, records, issues);
  }

  const reportDir = path.join(projectRoot, 'research/search-reports');
  fs.mkdirSync(reportDir, { recursive: true });
  writeJson(path.join(reportDir, 'reference-baseline.json'), {
    generatedAt: new Date().toISOString(),
    stats,
    issues,
  });
  fs.writeFileSync(path.join(reportDir, 'reference-baseline.md'), renderMarkdown(stats, issues));

  console.log('\n=== BREAK 参考资料基线审计报告 ===\n');
  for (const item of stats) {
    console.log(
      `${item.type}: total=${item.total}, withReferences=${item.withReferences}, references=${item.references}, lowQuality=${item.lowQualityRate}%`,
    );
  }
  console.log('\n## 问题汇总');
  console.log(`总问题数: ${issues.length}`);
  for (const severity of [...new Set(issues.map((issue) => issue.severity))].sort()) {
    console.log(`  ${severity}: ${issues.filter((issue) => issue.severity === severity).length}`);
  }
  for (const type of [...new Set(issues.map((issue) => issue.type))].sort()) {
    console.log(`  ${type}: ${issues.filter((issue) => issue.type === type).length}`);
  }
  console.log(`\n报告已保存到: ${path.join(reportDir, 'reference-baseline.md')}`);

  if (process.argv.includes('--strict') && issues.some((issue) => issue.severity === 'error')) {
    process.exitCode = 1;
  }
}

main();
