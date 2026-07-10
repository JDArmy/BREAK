// Term 分类强约束：语义 key、集中注册表、短中文名和国际化单一来源。

import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';

const keyPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const registryPath = path.join(projectRoot, 'src/BREAK/term-categories/termCategories.json');
const enRegistryPath = path.join(projectRoot, 'src/i18n/en/BREAK/term-categories/termCategories.json');
const enTermsDir = path.join(projectRoot, 'src/i18n/en/BREAK/terms');
const reportPath = path.join(projectRoot, 'research/search-reports/term-category-enum.json');

const errors = [];
const reviews = [];
const registry = readJson(registryPath);
const enRegistry = readJson(enRegistryPath);
const groups = registry.groups && typeof registry.groups === 'object' ? registry.groups : {};
const categories = registry.categories && typeof registry.categories === 'object' ? registry.categories : {};

function addError(message, detail = {}) {
  errors.push({ severity: 'error', message, ...detail });
}

function countHan(value) {
  return (String(value).match(/\p{Script=Han}/gu) || []).length;
}

function validateMetadata(kind, records, requireGroup) {
  const titles = new Map();
  for (const [key, item] of Object.entries(records)) {
    if (!keyPattern.test(key)) {
      addError(`${kind}.${key}: key 必须是有语义的小写 snake_case`);
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      addError(`${kind}.${key}: 必须是对象`);
      continue;
    }
    if (!String(item.title || '').trim()) addError(`${kind}.${key}.title: 不能为空`);
    if (countHan(item.title) > 6) addError(`${kind}.${key}.title: 中文名称最多 6 个汉字`);
    if (!String(item.description || '').trim()) addError(`${kind}.${key}.description: 不能为空`);
    if (!Number.isInteger(item.order) || item.order < 0) addError(`${kind}.${key}.order: 必须是非负整数`);
    if (requireGroup && !groups[item.group]) addError(`${kind}.${key}.group: 引用了不存在的分组 ${item.group}`);
    if (!requireGroup && 'group' in item) addError(`${kind}.${key}: 分组节点不能再引用 group`);

    const normalizedTitle = String(item.title || '').trim();
    if (normalizedTitle) {
      if (titles.has(normalizedTitle)) {
        addError(`${kind}.${key}.title: 与 ${titles.get(normalizedTitle)} 重复使用“${normalizedTitle}”`);
      } else {
        titles.set(normalizedTitle, key);
      }
    }
  }
}

function validateTranslations(kind, zhRecords, enRecords) {
  const zhKeys = Object.keys(zhRecords).sort();
  const enKeys = Object.keys(enRecords || {}).sort();
  if (JSON.stringify(zhKeys) !== JSON.stringify(enKeys)) {
    addError(`英文 ${kind} key 必须与中文注册表完全一致`);
  }
  for (const key of zhKeys) {
    const item = enRecords?.[key];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      addError(`英文 ${kind}.${key}: 缺少翻译对象`);
      continue;
    }
    const extraFields = Object.keys(item).filter((field) => !['title', 'description'].includes(field));
    if (extraFields.length) addError(`英文 ${kind}.${key}: 包含结构字段 ${extraFields.join(', ')}`);
    for (const field of ['title', 'description']) {
      const value = String(item[field] || '').trim();
      if (!value) addError(`英文 ${kind}.${key}.${field}: 不能为空`);
      if (/\p{Script=Han}/u.test(value)) addError(`英文 ${kind}.${key}.${field}: 不得包含中文`);
    }
  }
}

if (!registry.groups || !registry.categories) addError('Term 分类注册表必须包含 groups 和 categories');
validateMetadata('groups', groups, false);
validateMetadata('categories', categories, true);
validateTranslations('groups', groups, enRegistry.groups);
validateTranslations('categories', categories, enRegistry.categories);

const usage = new Map(Object.keys(categories).map((key) => [key, 0]));
const terms = loadAllEntities('terms');
for (const { key, entity } of terms) {
  const category = String(entity.category || '').trim();
  if (!keyPattern.test(category)) addError(`${key}.category="${category}" 不是合法语义 key`, { key, category });
  if (!categories[category]) addError(`${key}.category="${category}" 未在 Term 分类注册表中定义`, { key, category });
  if (categories[category]) usage.set(category, (usage.get(category) || 0) + 1);
}

for (const [category, count] of usage) {
  if (count === 0) addError(`分类 ${category} 未被任何 Term 使用`);
  if (count === 1) reviews.push({ severity: 'review', category, message: `分类 ${category} 仅有 1 条术语，建议复核是否需要合并` });
  if (count / Math.max(terms.length, 1) > 0.25) {
    reviews.push({ severity: 'review', category, message: `分类 ${category} 占比超过 25%，建议复核是否过于宽泛` });
  }
}

for (const file of fs.readdirSync(enTermsDir).filter((item) => item.endsWith('.json'))) {
  const records = readJson(path.join(enTermsDir, file));
  for (const [key, entity] of Object.entries(records)) {
    if (entity && typeof entity === 'object' && 'category' in entity) {
      addError(`英文术语 ${key} 不得维护 category，分类标题统一由注册表翻译`);
    }
  }
}

writeJson(reportPath, {
  generatedAt: new Date().toISOString(),
  summary: { error: errors.length, review: reviews.length, groups: Object.keys(groups).length, categories: Object.keys(categories).length },
  usage: Object.fromEntries([...usage].sort((a, b) => b[1] - a[1])),
  issues: [...errors, ...reviews],
});

console.log('\n=== Term 分类注册表校验 ===');
console.log(`分组 ${Object.keys(groups).length} 个，分类 ${Object.keys(categories).length} 个，术语 ${terms.length} 条`);
console.log(`error: ${errors.length}，review: ${reviews.length}`);
for (const issue of [...errors, ...reviews].slice(0, 40)) console.log(`  ${issue.severity === 'error' ? '❌' : '🔍'} ${issue.message}`);

if (errors.length) process.exit(1);
console.log('✅ Term 分类 key、注册表、短名称和英文翻译均通过校验');
