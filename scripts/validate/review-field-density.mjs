// C 类 LLM：字段信息密度深层判断
// 规则：field_information_density — 套话黑名单之外的低质内容（如"该风险需要关注并采取措施"未命中黑名单但无实质）→ LLM 判信息密度

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';
import { runReview, exitCodeFor } from '../llm/llm-review-runner.mjs';

const opts = parseArgs(process.argv.slice(2));

const ALL_TYPES = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms', 'cases'];

let items;
if (opts.full) {
  items = ALL_TYPES.flatMap((t) => loadAllEntities(t).map((r) => ({ key: r.key, type: t, entity: r.entity })));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef });
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

function buildPrompt(item) {
  const { entity, type } = item;
  const sys = `你是 BREAK 知识库的字段信息密度评审员。判断文本字段是否有实质信息（非套话、非空洞、非泛泛）。
严格规则：
1. 只输出 JSON 对象。
2. fields：逐字段判 definition/description/influence/limitation/summary/usageExample（按实体类型有的字段）
   - isSubstantive: 是否有实质内容（非套话堆砌）
   - hasSpecificFact: 是否含具体技术/场景/数据/案例
   - informationDensity: 'high'/'medium'/'low'
   - verdict: pass/review/fail
3. verdict：总体（取最差字段）。fail=某字段空洞无实质；review=薄弱；pass=充足。
4. reason: 一句话。suggestions: 数组。`;
  const fields = [];
  for (const f of ['definition', 'description', 'influence', 'limitation', 'summary', 'usageExample']) {
    if (entity[f] != null) fields.push(`${f}: ${String(entity[f]).slice(0, 300)}`);
  }
  const user = `【实体】${type} ${item.key} ${entity.title}

【字段】
${fields.join('\n')}

请判断各字段信息密度，输出 JSON。`;
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
  if (!data.fields || typeof data.fields !== 'object') data.fields = {};
}

const results = await runReview({
  name: 'field-density',
  items,
  buildPrompt,
  validateResult,
  fingerprintFields: ['definition', 'description', 'influence', 'limitation', 'summary', 'usageExample'],
  model: 'text',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
