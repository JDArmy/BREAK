// B 类 subagent 交叉判断：references 权威性应补源（机器分级之外的语义判断）
// 规则：references_authority_final — A 类 references.mjs 机器分级后，判断权威性是否充足、是否应补 primary
// 注：标题与页面一致性的深层抓取核验在 C 类 review-case-fact/review-references 合并，此处不抓取

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';
import { classifySource, highValueCategories } from './source-classify.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

const ALL_TYPES = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms', 'cases'];

let items;
if (opts.full) {
  items = ALL_TYPES.flatMap((t) => loadAllEntities(t).map((r) => ({ key: r.key, type: t, entity: r.entity })));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
  items = changed
    .filter((c) => ALL_TYPES.includes(c.type) && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: c.type, entity: c.entity }));
}
if (opts.type) items = items.filter((it) => it.type === opts.type);
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

function prepareContext(item) {
  // 机器分级结果（来自 source-classify）
  const refs = Array.isArray(item.entity.references) ? item.entity.references : [];
  const classified = refs.map((r, i) => ({ index: i, title: r.title, link: r.link, ...classifySource(r) }));
  return { ...item, classifiedRefs: classified };
}

function buildPrompt(item) {
  const { entity, classifiedRefs, type } = item;
  const isHighValueCase = type === 'cases' && highValueCategories.has(entity.category);
  const sys = `你是 BREAK 知识库的 references 权威性评审员。结合实体内容与 references 的机器分级结果，判断权威性是否充足。
严格规则：
1. 只输出 JSON 对象。
2. refsReview：逐条判断 sourceType 是否合理、是否应替换为更权威源。
3. coverageAdequate：来源覆盖是否充足？高价值 Case（criminal_verdict 等）须 ≥2 源含 ≥1 primary。
4. shouldReplaceWeak：是否应把 weak 源替换为 primary？
5. verdict：pass(充足)/review(可补强)/fail(高价值实体仅 weak 源或标题链接严重不符)。
6. reason: 一句话。suggestions: 数组。`;
  const refList = (classifiedRefs || [])
    .map((r) => `- [${r.index}] ${r.sourceType}: ${r.title} (${r.link.slice(0, 60)})`)
    .join('\n');
  const user = `【实体】${item.type} ${item.key} ${entity.title}
${isHighValueCase ? `【高价值 Case 类别】${entity.category}（须 ≥2 源含 ≥1 primary）` : ''}
【definition/summary】${String(entity.definition || entity.summary || '').slice(0, 200)}

【references 机器分级】
${refList || '（无）'}

请判断 references 权威性是否充足，输出 JSON。`;
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
  if (!data.refsReview) data.refsReview = [];
  if (!Array.isArray(data.refsReview)) {
    if (typeof data.refsReview === 'object') data.refsReview = [data.refsReview];
    else data.refsReview = [];
  }
}

const results = await runSubagentReview({
  name: 'references',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['references', 'definition', 'summary'],
  model: 'text',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
