import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';
import {
  countEnglishWords,
  countZhChars,
  TEXT_LENGTH_POLICY,
} from './text-length-policy.mjs';

function loadRecords(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  if (!fs.existsSync(dir)) return [];
  const records = [];
  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json')).sort()) {
    const data = readJson(path.join(dir, file));
    for (const [key, entity] of Object.entries(data)) records.push({ key, entity });
  }
  return records;
}

const issues = [];
const stats = {};

for (const [type, fields] of Object.entries(TEXT_LENGTH_POLICY)) {
  const zhRecords = loadRecords(`src/BREAK/${type}`);
  const enByKey = new Map(
    loadRecords(`src/i18n/en/BREAK/${type}`).map(({ key, entity }) => [key, entity]),
  );
  stats[type] = { entities: zhRecords.length, checkedFields: Object.keys(fields).length };

  for (const { key, entity } of zhRecords) {
    const enEntity = enByKey.get(key) || {};
    for (const [field, policy] of Object.entries(fields)) {
      if (entity[field] !== undefined && entity[field] !== null && policy.maxZh) {
        const length = countZhChars(entity[field]);
        if (length > policy.maxZh) {
          issues.push({
            locale: 'zh',
            type,
            key,
            field,
            length,
            maximum: policy.maxZh,
            message: `${type}/${key}.${field} 中文过长：${length} 字，需 ≤${policy.maxZh} 字`,
          });
        }
      }
      if (enEntity[field] !== undefined && enEntity[field] !== null && policy.maxEnWords) {
        const length = countEnglishWords(enEntity[field]);
        if (length > policy.maxEnWords) {
          issues.push({
            locale: 'en',
            type,
            key,
            field,
            length,
            maximum: policy.maxEnWords,
            message: `${type}/${key}.${field} 英文过长：${length} 词，需 ≤${policy.maxEnWords} 词`,
          });
        }
      }
    }
  }
}

const reportDir = path.join(projectRoot, 'research/search-reports');
fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, 'entity-text-length.json'), {
  generatedAt: new Date().toISOString(),
  policy: TEXT_LENGTH_POLICY,
  stats,
  issues,
});

console.log('\n=== 实体文本长度上限检查 ===');
console.log(`问题数: ${issues.length}`);
for (const issue of issues.slice(0, 80)) console.log(`  ❌ ${issue.message}`);
if (issues.length > 80) console.log(`  ...另有 ${issues.length - 80} 条未显示`);

if (issues.length > 0) process.exitCode = 1;
else console.log('✅ 所有中英文文本均在宽松上限内');
