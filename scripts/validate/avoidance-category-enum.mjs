/**
 * Avoidance 分类语义 key 与中英文注册表门禁。
 * 分类 key 是对外数据契约，禁止回退为 AC01 等无语义编号。
 */

import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';

const CATEGORY_KEYS = ['prevention', 'perception', 'detection', 'disposition'];
const keyPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const zhPath = path.join(projectRoot, 'src/BREAK/avoidance-categories/avoidanceCategories.json');
const enPath = path.join(projectRoot, 'src/i18n/en/BREAK/avoidance-categories/avoidanceCategories.json');
const reportPath = path.join(projectRoot, 'research/search-reports/avoidance-category-enum.json');
const avoidancesDir = path.join(projectRoot, 'src/BREAK/avoidances');

const errors = [];
const reviews = [];
const addError = (message, context = {}) => errors.push({ severity: 'error', message, ...context });

const zh = readJson(zhPath);
const en = readJson(enPath);
const zhKeys = Object.keys(zh).sort();
const enKeys = Object.keys(en).sort();
const expectedKeys = [...CATEGORY_KEYS].sort();

if (JSON.stringify(zhKeys) !== JSON.stringify(expectedKeys)) {
  addError(`中文规避分类 key 必须为 ${CATEGORY_KEYS.join(', ')}`, { actual: zhKeys });
}
if (JSON.stringify(enKeys) !== JSON.stringify(expectedKeys)) {
  addError(`英文规避分类 key 必须与中文注册表完全一致`, { actual: enKeys });
}

const orders = new Set();
for (const [index, key] of CATEGORY_KEYS.entries()) {
  const item = zh[key];
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    addError(`中文规避分类 ${key} 缺少对象`);
    continue;
  }
  if (!keyPattern.test(key)) addError(`规避分类 ${key} 不是小写语义 key`);
  for (const field of ['title', 'description', 'keyword']) {
    if (!String(item[field] || '').trim()) addError(`中文规避分类 ${key}.${field} 不能为空`);
  }
  if (item.order !== index + 1) addError(`中文规避分类 ${key}.order 必须为 ${index + 1}`);
  if (orders.has(item.order)) addError(`中文规避分类存在重复 order: ${item.order}`);
  orders.add(item.order);

  const translation = en[key];
  if (!translation || typeof translation !== 'object' || Array.isArray(translation)) {
    addError(`英文规避分类 ${key} 缺少翻译对象`);
    continue;
  }
  const extraFields = Object.keys(translation).filter((field) => !['title', 'description'].includes(field));
  if (extraFields.length) addError(`英文规避分类 ${key} 包含结构字段: ${extraFields.join(', ')}`);
  for (const field of ['title', 'description']) {
    const value = String(translation[field] || '').trim();
    if (!value) addError(`英文规避分类 ${key}.${field} 不能为空`);
    if (/\p{Script=Han}/u.test(value)) addError(`英文规避分类 ${key}.${field} 不得包含中文`);
  }
}

const usage = Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0]));
for (const file of fs.readdirSync(avoidancesDir).filter((item) => item.endsWith('.json'))) {
  const entities = readJson(path.join(avoidancesDir, file));
  for (const [id, entity] of Object.entries(entities)) {
    const category = String(entity.category || '').trim();
    if (!keyPattern.test(category) || !CATEGORY_KEYS.includes(category)) {
      addError(`${id}.category="${category}" 不是合法规避分类语义 key`, { id, category });
      continue;
    }
    usage[category] += 1;
  }
}

for (const [key, count] of Object.entries(usage)) {
  if (count === 0) addError(`规避分类 ${key} 未被任何 Avoidance 使用`);
  if (count / Math.max(Object.values(usage).reduce((sum, value) => sum + value, 0), 1) > 0.7) {
    reviews.push({ severity: 'review', key, message: `规避分类 ${key} 占比超过 70%，建议复核分类分布` });
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
writeJson(reportPath, {
  generatedAt: new Date().toISOString(),
  summary: { error: errors.length, review: reviews.length, categories: CATEGORY_KEYS.length },
  usage,
  issues: [...errors, ...reviews],
});

console.log('\n=== Avoidance 分类语义 key 校验 ===');
console.log(`分类 ${CATEGORY_KEYS.length} 个，Avoidance ${Object.values(usage).reduce((sum, value) => sum + value, 0)} 条`);
console.log(`error: ${errors.length}，review: ${reviews.length}`);
for (const issue of [...errors, ...reviews].slice(0, 40)) console.log(`  ${issue.severity === 'error' ? '❌' : '🔍'} ${issue.message}`);

if (errors.length) process.exit(1);
console.log('✅ Avoidance 分类 key、注册表、中英文翻译和引用均通过校验');
