// B 类 subagent 交叉判断：新风险与规避手段的关系完整性
// 规则：
//   risk_avoidance_effectiveness — 新 Risk 的 avoidances 是否真能缓解该风险（读 Avoidance 实际内容交叉判断）
//   risk_missing_avoidance      — 该风险攻击向量本应有哪些 AC 类规避但未列（给候选）
// subagent 模式：加载 Risk 内容 + 其 avoidances 对应的所有 Avoidance 实体内容 + 全库 Avoidance 按 AC 分类，注入 prompt

import path from 'node:path';
import { projectRoot } from '../search/common.mjs';
import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, loadRelatedEntities, loadAvoidancesByCategory } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

// 收集待审 Risk
let items;
if (opts.full) {
  items = loadAllEntities('risks').map((r) => ({ key: r.key, type: 'risks', entity: r.entity }));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
  items = changed
    .filter((c) => c.type === 'risks' && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: 'risks', entity: c.entity }));
}
if (opts.type && opts.type !== 'risks') items = [];
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

// prepareContext：加载该 Risk 的 avoidances 对应 Avoidance 内容 + 全库 Avoidance 按 AC 分类
function prepareContext(item) {
  const { entity } = item;
  const avoidanceIds = Array.isArray(entity.avoidances) ? entity.avoidances : [];
  const relatedAvoidances = loadRelatedEntities('avoidances', avoidanceIds, ['title', 'category', 'definition', 'description', 'limitation']);
  const avoidancesByCat = loadAvoidancesByCategory();
  return { ...item, relatedAvoidances, avoidancesByCat };
}

function buildPrompt(item) {
  const { entity, relatedAvoidances, avoidancesByCat } = item;
  const sys = `你是 BREAK 知识库的风险-规避手段关系评审员。结合知识库已有的规避手段实体内容，判定给定风险的规避手段是否完整且有效。
严格规则：
1. 只输出 JSON 对象，不要解释、不要 markdown 代码块。
2. risk_avoidance_effectiveness：逐一判断当前 avoidances 是否真能缓解该风险（读 Avoidance 的 definition/description/limitation 交叉判断）。
   - effective: true 当该 avoidance 实质性覆盖该风险的某个攻击向量
   - fail 当存在明显不匹配的 avoidance（如该 avoidance 是验证码而风险是支付欺诈，毫无缓解关系）
   - review 当匹配薄弱或边界
3. risk_missing_avoidance：该风险攻击向量本应有哪些 AC 类规避但未列？给具体候选 avoidance title（从 avoidancesByCat 里找）。
   - prevention=防止、perception=感知、detection=识别、disposition=处置
4. verdict：pass/review/fail。fail=存在明显不匹配的 avoidance 或关键 AC 类完全缺失；review=薄弱；pass=覆盖合理。
5. reason: 一句话。suggestions: 数组，给具体补充建议。`;
  const relatedList = (relatedAvoidances || [])
    .map((a) => `- ${a.key} [${a.fields.category}] ${a.title}：${String(a.fields.definition || '').slice(0, 80)}`)
    .join('\n');
  const candidateList = Object.entries(avoidancesByCat || {})
    .map(([cat, list]) => `${cat}: ${list.slice(0, 15).map((a) => `${a.key}(${a.title})`).join(', ')}`)
    .join('\n');
  const user = `【风险】${item.key} ${entity.title}
【complexity】${entity.complexity}
【definition】${entity.definition || ''}
【description】${String(entity.description || '').slice(0, 400)}
【当前 avoidances】${(entity.avoidances || []).join(', ')}

【当前 avoidances 对应的 Avoidance 内容】
${relatedList || '（无）'}

【全库 Avoidance 候选（按 AC 分类，节选）】
${candidateList}

请判定规避手段是否有效、是否漏加，输出 JSON。`;
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

function validateResult(data) {
  if (!data || typeof data !== 'object') throw new Error('返回非对象');
  if (!['pass', 'review', 'fail'].includes(data.verdict)) throw new Error(`verdict 非法: ${data.verdict}`);
  if (typeof data.reason !== 'string' || !data.reason.trim()) throw new Error('reason 必须非空 string');
  if (!Array.isArray(data.suggestions)) throw new Error('suggestions 必须是数组');
  if (!data.risk_avoidance_effectiveness) data.risk_avoidance_effectiveness = [];
  if (!Array.isArray(data.risk_avoidance_effectiveness)) {
    if (typeof data.risk_avoidance_effectiveness === 'object') data.risk_avoidance_effectiveness = [data.risk_avoidance_effectiveness];
    else data.risk_avoidance_effectiveness = [];
  }
}

const results = await runSubagentReview({
  name: 'risk-avoidance',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['definition', 'description', 'avoidances'],
  model: 'multi',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
