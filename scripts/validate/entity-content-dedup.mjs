// 实体正文去重门禁：同类型实体不应以不同 ID 重复维护完全相同的核心正文。
// 规则保持保守：只阻断核心正文字段归一化后完全相同的重复组；
// 标题近似、同标题多来源等语义问题仍交给 title-dedup / granularity review。

import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

const STRICT = process.argv.includes('--strict');
const MIN_FIELD_LENGTH = 20;

const TYPE_CONFIGS = {
  risks: {
    label: 'Risk',
    fields: ['definition', 'description', 'influence'],
  },
  avoidances: {
    label: 'Avoidance',
    fields: ['definition', 'description', 'limitation'],
  },
  'attack-tools': {
    label: 'AttackTool',
    fields: ['description'],
  },
  'threat-actors': {
    label: 'ThreatActor',
    fields: ['description'],
  },
  terms: {
    label: 'Term',
    fields: ['definition', 'description', 'usageExample'],
  },
  cases: {
    label: 'Case',
    fields: ['summary'],
  },
};

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .trim();
}

function contentFingerprint(entity, fields) {
  const parts = fields.map((field) => normalizeText(entity[field]));
  if (parts.some((part) => part.length < MIN_FIELD_LENGTH)) return null;
  return parts.join('\n');
}

function makeIssue(type, config, records) {
  const sorted = [...records].sort((a, b) => a.key.localeCompare(b.key));
  const sample = sorted[0];
  return {
    severity: 'error',
    type,
    label: config.label,
    fields: config.fields,
    keys: sorted.map((record) => record.key),
    title: sample.entity.title,
    message: `${config.label} 核心正文完全重复：${sorted.map((record) => record.key).join(', ')}（${sample.entity.title}）`,
  };
}

const issues = [];
const scanned = {};

for (const [type, config] of Object.entries(TYPE_CONFIGS)) {
  const groups = new Map();
  const records = loadAllEntities(type);
  scanned[type] = records.length;

  for (const record of records) {
    const fingerprint = contentFingerprint(record.entity, config.fields);
    if (!fingerprint) continue;
    if (!groups.has(fingerprint)) groups.set(fingerprint, []);
    groups.get(fingerprint).push(record);
  }

  for (const recordsInGroup of groups.values()) {
    if (recordsInGroup.length > 1) {
      issues.push(makeIssue(type, config, recordsInGroup));
    }
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'entity-content-dedup.json'), {
  generatedAt: new Date().toISOString(),
  summary: {
    error: issues.length,
    scanned,
    minFieldLength: MIN_FIELD_LENGTH,
    checkedTypes: Object.keys(TYPE_CONFIGS),
  },
  issues,
});

console.log('\n=== 实体正文去重校验 ===');
console.log(`error: ${issues.length}`);
for (const issue of issues.slice(0, 30)) {
  console.log(`  ❌ ${issue.message}`);
}
if (issues.length > 30) console.log(`  ...另有 ${issues.length - 30} 组未显示`);

if (STRICT && issues.length > 0) {
  console.log('\n❌ 实体存在完全重复核心正文，校验失败');
  process.exit(1);
}

console.log('\n✅ 实体正文去重校验通过');
