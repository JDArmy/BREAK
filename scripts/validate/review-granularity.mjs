// B 类 subagent 交叉判断：实体粒度终判（合并 + 拆分双向）+ title 近义终判
// 规则：
//   entity_granularity_final — A 类 entity-granularity.mjs 初筛标记的实体 + 同 type 相似实体内容，双向合并/拆分建议
//   title_near_dup_final     — A 类 title-dedup.mjs 标 review 的近义，终判是否真同一实体应合并

import fs from 'fs';
import path from 'path';
import { projectRoot } from '../search/common.mjs';
import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, findSimilarTitles, loadRelatedEntities } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

// 收集待审实体（变更实体或全库）
let items;
if (opts.full) {
  const types = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms'];
  items = types.flatMap((t) => loadAllEntities(t).map((r) => ({ key: r.key, type: t, entity: r.entity })));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
  items = changed
    .filter((c) => ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms'].includes(c.type) && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: c.type, entity: c.entity }));
}
if (opts.type) items = items.filter((it) => it.type === opts.type);
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

function prepareContext(item) {
  // 找近义 title 候选（可能应合并）
  const similar = findSimilarTitles(item.entity.title, { type: item.type, maxDist: 2 });
  // 加载相似实体的内容
  const similarKeys = similar.map((s) => s.key);
  const similarEntities = loadRelatedEntities(item.type, similarKeys, ['title', 'definition', 'description']);
  // 加载同父的兄弟实体（用于判断是否应拆分）
  const parentKey = item.key.includes('-') ? item.key.split('-')[0] : item.key;
  const allInType = loadAllEntities(item.type);
  const siblings = allInType
    .filter((r) => r.key !== item.key && r.key.split('-')[0] === parentKey)
    .map((r) => ({ key: r.key, title: r.entity.title, definition: String(r.entity.description || '').slice(0, 80) }));
  return { ...item, similarEntities, siblings };
}

function buildPrompt(item) {
  const { entity, similarEntities, siblings } = item;
  const sys = `你是 BREAK 知识库的实体粒度评审员。结合同 type 相似实体及兄弟实体的实际内容，判定实体最佳存在方式。
严格规则：
1. 只输出 JSON 对象。
2. granularity：
   - action: 'none'/'merge'/'split'
   - merge：当前实体应作为某已有实体的子实体（给 mergeToParentKey + reason）
   - split：当前实体应拆出子实体（给 splitInto 数组，每个含 suggestedTitle + 所覆盖的 description 片段）
3. title_near_dup_final：若存在近义 title，判断是否真同一实体应合并（isDuplicate + duplicateOf）。
4. verdict：pass(粒度合理)/review(建议合并或拆分)/fail(明显应合并或拆分未做)。
5. reason: 一句话。suggestions: 数组。`;
  const simList = (similarEntities || [])
    .map((s) => `- ${s.key} ${s.title}：${String(s.fields.definition || s.fields.description || '').slice(0, 80)}`)
    .join('\n');
  const sibList = (siblings || []).map((s) => `- ${s.key} ${s.title}`).join('\n');
  const user = `【实体】${item.type} ${item.key} ${entity.title}
【definition】${entity.definition || ''}
【description】${String(entity.description || '').slice(0, 400)}

【近义 title 候选（可能应合并）】
${simList || '（无）'}

【兄弟实体（同父，用于判断拆分）】
${sibList || '（无）'}

请判定实体粒度是否合理（合并/拆分双向），输出 JSON。`;
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

function validateResult(data) {
  if (!data || typeof data !== 'object') throw new Error('返回非对象');
  if (!['pass', 'review', 'fail'].includes(data.verdict)) throw new Error(`verdict 非法: ${data.verdict}`);
  if (typeof data.reason !== 'string' || !data.reason.trim()) throw new Error('reason 必须非空');
  if (!Array.isArray(data.suggestions)) throw new Error('suggestions 必须是数组');
  if (!data.granularity || typeof data.granularity !== 'object') data.granularity = { action: 'none' };
}

const results = await runSubagentReview({
  name: 'granularity',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['title', 'definition', 'description'],
  model: 'multi',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
