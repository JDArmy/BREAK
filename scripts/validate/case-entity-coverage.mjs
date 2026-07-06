import fs from 'node:fs';
import path from 'node:path';
import { domainOf, ensureDir, loadEntities, projectRoot, writeJson } from '../search/common.mjs';
import { classifySource, strongestSourceType, highValueCategories } from './source-classify.mjs';

const MAX_CASES_PER_ENTITY = Number.parseInt(
  process.argv.find((arg) => arg.startsWith('--max='))?.split('=')[1] || '10',
  10,
);
const strict = process.argv.includes('--strict');
const reportDir = path.join(projectRoot, 'research/search-reports');
const reportJsonPath = path.join(reportDir, 'case-entity-coverage.json');
const reportMdPath = path.join(reportDir, 'case-entity-coverage.md');

if (!Number.isInteger(MAX_CASES_PER_ENTITY) || MAX_CASES_PER_ENTITY < 1) {
  console.error('[case-entity-coverage] --max 必须是正整数');
  process.exit(1);
}

const entityTypes = [
  { type: 'risk', collection: 'risks', caseField: 'relatedRisks' },
  { type: 'attackTool', collection: 'attack-tools', caseField: 'relatedAttackTools' },
  { type: 'threatActor', collection: 'threat-actors', caseField: 'relatedThreatActors' },
];

function createEntityIndex() {
  const index = new Map();

  for (const config of entityTypes) {
    for (const { key, entity, filePath } of loadEntities(config.collection)) {
      index.set(`${config.type}:${key}`, {
        type: config.type,
        key,
        title: entity.title || '',
        filePath: path.relative(projectRoot, filePath),
        caseKeys: new Set(),
      });
    }
  }

  return index;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{Script=Han}\p{Letter}\p{Number}]+/gu, '')
    .trim();
}

function createCaseProfile(caseKey, entity) {
  const references = (entity.references || []).map((ref) => ({
    title: ref.title || '',
    link: ref.link || '',
    domain: domainOf(ref.link),
    ...classifySource(ref),
  }));
  const sourceTypes = [...new Set(references.map((ref) => ref.sourceType))];
  const strongest = strongestSourceType(sourceTypes);
  const hasPrimary = sourceTypes.includes('primary');
  const isHighValue = highValueCategories.has(entity.category);
  const qualityFlags = [
    ...(isHighValue && !hasPrimary ? ['high_value_missing_primary'] : []),
    ...(sourceTypes.length === 1 && sourceTypes[0] === 'secondary' ? ['secondary_only'] : []),
    ...(sourceTypes.includes('mirror') ? ['has_mirror_source'] : []),
    ...(sourceTypes.includes('weak') ? ['has_weak_source'] : []),
    ...(sourceTypes.length === 1 && sourceTypes[0] === 'unknown' ? ['unknown_only'] : []),
  ];

  return {
    key: caseKey,
    title: entity.title || '',
    summary: entity.summary || '',
    category: entity.category || '',
    incidentTime: entity.incidentTime || '',
    strongestSourceType: strongest,
    sourceTypes,
    qualityFlags,
    titleFingerprint: normalizeText(entity.title),
    summaryFingerprint: normalizeText(entity.summary).slice(0, 80),
  };
}

function sourcePenalty(profile) {
  let score = 0;
  if (profile.qualityFlags.includes('has_weak_source')) score += 80;
  if (profile.qualityFlags.includes('unknown_only')) score += 70;
  if (profile.qualityFlags.includes('has_mirror_source')) score += 55;
  if (profile.qualityFlags.includes('secondary_only')) score += 45;
  if (profile.qualityFlags.includes('high_value_missing_primary')) score += 35;
  if (profile.strongestSourceType === 'primary') score -= 30;
  return score;
}

function collectCaseCoverage(entityIndex) {
  const unknownRefs = [];
  const caseProfiles = new Map();

  for (const { key: caseKey, entity } of loadEntities('cases')) {
    caseProfiles.set(caseKey, createCaseProfile(caseKey, entity));
    for (const config of entityTypes) {
      const refs = Array.isArray(entity[config.caseField]) ? entity[config.caseField] : [];
      for (const ref of new Set(refs)) {
        const entityId = `${config.type}:${ref}`;
        const item = entityIndex.get(entityId);
        if (!item) {
          unknownRefs.push({
            caseKey,
            entityType: config.type,
            field: config.caseField,
            ref,
          });
          continue;
        }
        item.caseKeys.add(caseKey);
      }
    }
  }

  return { unknownRefs, caseProfiles };
}

function duplicateSignals(profiles) {
  const titleCounts = new Map();
  const summaryCounts = new Map();

  for (const profile of profiles) {
    if (profile.titleFingerprint) {
      titleCounts.set(profile.titleFingerprint, (titleCounts.get(profile.titleFingerprint) || 0) + 1);
    }
    if (profile.summaryFingerprint) {
      summaryCounts.set(profile.summaryFingerprint, (summaryCounts.get(profile.summaryFingerprint) || 0) + 1);
    }
  }

  return new Map(
    profiles.map((profile) => {
      const duplicatedByTitle = profile.titleFingerprint && titleCounts.get(profile.titleFingerprint) > 1;
      const duplicatedBySummary = profile.summaryFingerprint && summaryCounts.get(profile.summaryFingerprint) > 1;
      return [
        profile.key,
        {
          duplicatedByTitle: Boolean(duplicatedByTitle),
          duplicatedBySummary: Boolean(duplicatedBySummary),
        },
      ];
    }),
  );
}

function relationRemovalCandidates(entity, caseProfiles) {
  const profiles = [...entity.caseKeys].map((caseKey) => caseProfiles.get(caseKey)).filter(Boolean);
  const duplicates = duplicateSignals(profiles);

  return profiles
    .map((profile) => {
      const duplicate = duplicates.get(profile.key) || {};
      const duplicatePenalty =
        (duplicate.duplicatedByTitle ? 120 : 0) + (duplicate.duplicatedBySummary ? 90 : 0);
      const score = sourcePenalty(profile) + duplicatePenalty;
      const reasons = [
        ...(duplicate.duplicatedByTitle ? ['标题重复'] : []),
        ...(duplicate.duplicatedBySummary ? ['摘要重复'] : []),
        ...profile.qualityFlags,
      ];
      return {
        key: profile.key,
        title: profile.title,
        category: profile.category,
        incidentTime: profile.incidentTime,
        strongestSourceType: profile.strongestSourceType,
        sourceTypes: profile.sourceTypes,
        reasons,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

function buildReport() {
  const entityIndex = createEntityIndex();
  const { unknownRefs, caseProfiles } = collectCaseCoverage(entityIndex);
  const entities = [...entityIndex.values()]
    .map((item) => ({
      type: item.type,
      key: item.key,
      title: item.title,
      filePath: item.filePath,
      caseCount: item.caseKeys.size,
      caseKeys: [...item.caseKeys].sort(),
    }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.key.localeCompare(b.key));

  const zeroCaseEntities = entities.filter((item) => item.caseCount === 0);
  const overLimitEntities = entities
    .filter((item) => item.caseCount > MAX_CASES_PER_ENTITY)
    .map((item) => ({
      ...item,
      relationRemovalNeed: item.caseCount - MAX_CASES_PER_ENTITY,
      relationRemovalCandidates: relationRemovalCandidates(item, caseProfiles),
    }))
    .sort((a, b) => b.caseCount - a.caseCount || a.type.localeCompare(b.type) || a.key.localeCompare(b.key));

  const byType = entityTypes.map(({ type }) => {
    const scoped = entities.filter((item) => item.type === type);
    const zero = scoped.filter((item) => item.caseCount === 0);
    const overLimit = scoped.filter((item) => item.caseCount > MAX_CASES_PER_ENTITY);
    return {
      type,
      total: scoped.length,
      withCases: scoped.length - zero.length,
      zeroCases: zero.length,
      overLimit: overLimit.length,
      maxCaseCount: scoped.reduce((max, item) => Math.max(max, item.caseCount), 0),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    maxCasesPerEntity: MAX_CASES_PER_ENTITY,
    summary: {
      total: entities.length,
      withCases: entities.length - zeroCaseEntities.length,
      zeroCases: zeroCaseEntities.length,
      overLimit: overLimitEntities.length,
      unknownRefs: unknownRefs.length,
    },
    byType,
    overLimitEntities,
    zeroCaseEntities,
    unknownRefs,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# 实体案例覆盖报告',
    '',
    `生成时间: ${report.generatedAt}`,
    `单实体案例数上限: ${report.maxCasesPerEntity}`,
    '',
    '## 汇总',
    '',
    '| 范围 | 总数 | 有案例 | 0 案例 | 超上限 | 最大案例数 |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const item of report.byType) {
    lines.push(
      `| ${item.type} | ${item.total} | ${item.withCases} | ${item.zeroCases} | ${item.overLimit} | ${item.maxCaseCount} |`,
    );
  }

  lines.push('', '## 超上限实体', '');
  if (report.overLimitEntities.length === 0) {
    lines.push('未发现超上限实体。');
  } else {
    lines.push('| 类型 | 实体 | 案例数 | 需移除关联 | 案例 |');
    lines.push('| --- | --- | ---: | ---: | --- |');
    for (const item of report.overLimitEntities) {
      lines.push(
        `| ${item.type} | ${item.key} ${item.title} | ${item.caseCount} | ${item.relationRemovalNeed} | ${item.caseKeys.join(', ')} |`,
      );
    }

    lines.push('', '## 超上限实体关联移除候选', '');
    lines.push('候选排序优先考虑低质量来源与同一实体下的重复标题/摘要；这里只建议移除 Case 到实体的关联，不删除 Case 条目。');
    for (const item of report.overLimitEntities) {
      lines.push('', `### ${item.type}:${item.key} ${item.title}`);
      lines.push(`需移除关联数: ${item.relationRemovalNeed}`);
      lines.push('| 候选案例 | 来源强度 | 原因 |');
      lines.push('| --- | --- | --- |');
      for (const candidate of item.relationRemovalCandidates.slice(0, item.relationRemovalNeed + 5)) {
        const reasons = candidate.reasons.length ? candidate.reasons.join(', ') : '低优先级候选';
        lines.push(
          `| ${candidate.key} ${candidate.title} | ${candidate.strongestSourceType} | ${reasons} |`,
        );
      }
    }
  }

  lines.push('', '## 0 案例实体', '');
  if (report.zeroCaseEntities.length === 0) {
    lines.push('未发现 0 案例实体。');
  } else {
    lines.push('| 类型 | 实体 | 文件 |');
    lines.push('| --- | --- | --- |');
    for (const item of report.zeroCaseEntities) {
      lines.push(`| ${item.type} | ${item.key} ${item.title} | ${item.filePath} |`);
    }
  }

  if (report.unknownRefs.length > 0) {
    lines.push('', '## 悬空案例关系', '');
    lines.push('| 案例 | 字段 | 引用 |');
    lines.push('| --- | --- | --- |');
    for (const item of report.unknownRefs) {
      lines.push(`| ${item.caseKey} | ${item.field} | ${item.ref} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
ensureDir(reportDir);
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, renderMarkdown(report));

console.log('\n=== 实体案例覆盖报告 ===\n');
console.log(`maxCasesPerEntity=${report.maxCasesPerEntity}`);
console.log(`entities=${report.summary.total}`);
console.log(`zeroCases=${report.summary.zeroCases}`);
console.log(`overLimit=${report.summary.overLimit}`);
console.log(`unknownRefs=${report.summary.unknownRefs}`);
for (const item of report.byType) {
  console.log(
    `${item.type}: withCases=${item.withCases}/${item.total}, zeroCases=${item.zeroCases}, overLimit=${item.overLimit}, max=${item.maxCaseCount}`,
  );
}
console.log(`\n报告已保存到: ${reportMdPath}`);

if (strict && report.overLimitEntities.length > 0) {
  console.error(`\n[case-entity-coverage] 发现 ${report.overLimitEntities.length} 个实体案例数超过上限 ${MAX_CASES_PER_ENTITY}`);
  for (const item of report.overLimitEntities.slice(0, 20)) {
    console.error(`- ${item.type}:${item.key} ${item.title} caseCount=${item.caseCount}`);
  }
  if (report.overLimitEntities.length > 20) {
    console.error(`- 另有 ${report.overLimitEntities.length - 20} 个实体未显示，请查看报告。`);
  }
  process.exit(1);
}
