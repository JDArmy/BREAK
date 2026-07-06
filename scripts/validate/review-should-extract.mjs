// B 类 subagent 交叉判断：是否应从实体提炼新实体（建议新增维度）
// 规则：should_extract_new — 变更实体内容 + 全库已有实体，判断是否应提炼新风险/规避手段/攻击工具/威胁行为者/术语/案例

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

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
  // 加载全库已有实体 title 列表（用于判断建议新增的是否已存在）
  const existingTitles = {
    risks: loadAllEntities('risks').map((r) => r.entity.title),
    avoidances: loadAllEntities('avoidances').map((r) => r.entity.title),
    'attack-tools': loadAllEntities('attack-tools').map((r) => r.entity.title),
    'threat-actors': loadAllEntities('threat-actors').map((r) => r.entity.title),
    terms: loadAllEntities('terms').map((r) => r.entity.title),
  };
  return { ...item, existingTitles };
}

function buildPrompt(item) {
  const { entity, existingTitles } = item;
  const sys = `你是 BREAK 知识库的实体抽取评审员。判断是否应从给定实体提炼新的独立实体。
严格规则：
1. 只输出 JSON 对象。
2. shouldExtractNew：
   - newRisks: 建议提炼的新风险（含 suggestedTitle + reason + 已存在与否）
   - newAvoidances: 建议提炼的新规避手段
   - newAttackTools: 建议提炼的新攻击工具
   - newThreatActors: 建议提炼的新威胁行为者
   - newTerms: 建议抽象的新术语（实体文本反复出现某概念但无对应 Term）
   - newCases: 建议补充的新案例（某风险缺典型案例）
   - 每条建议需检查 existingTitles，若已存在则标注 existing:true
3. shouldAbstractTerm：该实体文本是否反复出现某概念但无对应 Term？给候选 term title。
4. verdict：pass(无需提炼)/review(有提炼建议)/fail(明显应提炼未做)。
5. reason: 一句话。suggestions: 数组。`;
  const user = `【实体】${item.type} ${item.key} ${entity.title}
【definition】${entity.definition || ''}
【description】${String(entity.description || '').slice(0, 500)}

【全库已有实体 title（用于判断建议新增的是否已存在，节选各 20 个）】
risks: ${(existingTitles?.risks || []).slice(0, 20).join(', ')}
avoidances: ${(existingTitles?.avoidances || []).slice(0, 20).join(', ')}
attack-tools: ${(existingTitles?.['attack-tools'] || []).slice(0, 20).join(', ')}
threat-actors: ${(existingTitles?.['threat-actors'] || []).slice(0, 20).join(', ')}
terms: ${(existingTitles?.terms || []).slice(0, 20).join(', ')}

请判断是否应提炼新实体，输出 JSON。`;
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
  if (!data.shouldExtractNew || typeof data.shouldExtractNew !== 'object') data.shouldExtractNew = {};
}

const results = await runSubagentReview({
  name: 'should-extract',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['definition', 'description'],
  model: 'multi',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
