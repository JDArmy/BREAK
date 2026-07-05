// C 类 LLM：category 语义贴切度
// 规则：category_semantic_fit — A 类强信号校验之外，category 与 description 语义贴切度
// （如 description 写感知内容但 category 标 AC01；Case category 与 summary 内容不符）

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';
import { runReview, exitCodeFor } from '../llm/llm-review-runner.mjs';

const opts = parseArgs(process.argv.slice(2));

let items;
if (opts.full) {
  items = ['risks', 'avoidances', 'cases', 'terms']
    .flatMap((t) => loadAllEntities(t).map((r) => ({ key: r.key, type: t, entity: r.entity })));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef });
  items = changed
    .filter((c) => ['risks', 'avoidances', 'cases', 'terms'].includes(c.type) && (c.isNew || c.hasContentChange))
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
  const sys = `你是 BREAK 知识库的分类语义贴切度评审员。判断 category/complexity/effectiveness 是否与实体内容语义贴切。
重要：不同实体类型有不同字段，不要评不存在的字段：
- Risk：只有 complexity（basic/intermediate/advanced），**无 category 字段**，不要评 category（category 为空是正常的，不算缺失/错配）
- Avoidance：有 category（AC01-04）+ effectiveness（high/medium/low）
- Case：有 category（6 枚举）
- Term：有 category（自由字符串）
严格规则：
1. 只输出 JSON 对象。
2. category（仅 Avoidance/Case/Term）：
   - current: bool（当前 category 是否贴切）
   - suggested: 建议的 category（若不贴切）
   - 对 Risk 跳过 category（设 current=true, suggested=null）
   分类枚举：
     Avoidance.category: AC01(防止)/AC02(感知)/AC03(识别)/AC04(处置)
     Case.category: criminal_verdict/administrative_enforcement/security_incident/vulnerability_advisory/academic_research/news_report
     Term.category: 自由字符串（如"信贷欺诈""数据泄露"等）
3. complexity（仅 Risk）：basic/intermediate/advanced 是否贴切
4. effectiveness（仅 Avoidance）：high/medium/low 是否贴切
5. verdict：pass(贴切)/review(边界)/fail(明显错配)。
6. reason: 一句话。suggestions: 数组。`;
  const user = `【实体】${type} ${item.key} ${entity.title}
【category】${entity.category || ''}
${entity.complexity ? `【complexity】${entity.complexity}` : ''}
${entity.effectiveness ? `【effectiveness】${entity.effectiveness}` : ''}
【definition】${entity.definition || ''}
【description】${String(entity.description || '').slice(0, 300)}
${entity.summary ? `【summary】${entity.summary}` : ''}

请判断分类是否语义贴切，输出 JSON。`;
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
  if (!data.category || typeof data.category !== 'object') data.category = {};
}

const results = await runReview({
  name: 'classification',
  items,
  buildPrompt,
  validateResult,
  fingerprintFields: ['category', 'complexity', 'effectiveness', 'definition', 'description', 'summary'],
  model: 'text',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
