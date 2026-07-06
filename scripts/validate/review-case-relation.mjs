// B 类 subagent 交叉判断：Case 与关联风险的相关性
// 规则：case_risk_relevance — 读 Case summary + relatedRisks 对应 Risk 内容，判断案例是否真与关联风险相关

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, loadRelatedEntities } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

let items;
if (opts.full) {
  items = loadAllEntities('cases').map((r) => ({ key: r.key, type: 'cases', entity: r.entity }));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
  items = changed
    .filter((c) => c.type === 'cases' && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: 'cases', entity: c.entity }));
}
if (opts.type && opts.type !== 'cases') items = [];
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

function prepareContext(item) {
  const { entity } = item;
  const riskIds = Array.isArray(entity.relatedRisks) ? entity.relatedRisks : [];
  const relatedRisks = loadRelatedEntities('risks', riskIds, ['title', 'definition', 'description']);
  const atIds = Array.isArray(entity.relatedAttackTools) ? entity.relatedAttackTools : [];
  const relatedAttackTools = loadRelatedEntities('attack-tools', atIds, ['title', 'description']);
  return { ...item, relatedRisks, relatedAttackTools };
}

function buildPrompt(item) {
  const { entity, relatedRisks, relatedAttackTools } = item;
  const sys = `你是 BREAK 知识库的案例-风险关联评审员。结合关联风险/工具的实际内容，判断案例是否真与关联实体相关。
严格规则：
1. 只输出 JSON 对象。
2. case_risk_relevance：逐一判断 relatedRisks 是否与案例 summary 内容匹配。
   - relevant: true 当案例事实真涉及该风险
   - fail 当存在明显错配（如 summary 是 DDoS 但关联 R0001 撞库）
3. missingRelations：summary 提及但未关联的风险/工具类型（不给具体 ID，给风险类型描述）。
4. verdict：pass/review/fail。fail=存在明显错配；review=部分薄弱；pass=关联合理。
5. reason: 一句话。suggestions: 数组。`;
  const riskList = (relatedRisks || [])
    .map((r) => `- ${r.key} ${r.title}：${String(r.fields.definition || '').slice(0, 80)}`)
    .join('\n');
  const atList = (relatedAttackTools || [])
    .map((a) => `- ${a.key} ${a.title}：${String(a.fields.description || '').slice(0, 80)}`)
    .join('\n');
  const user = `【案例】${item.key} ${entity.title}
【category】${entity.category}
【incidentTime】${entity.incidentTime || ''}
【summary】${entity.summary || ''}

【关联风险】
${riskList || '（无）'}

【关联攻击工具】
${atList || '（无）'}

请判断案例与关联实体是否匹配，输出 JSON。`;
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
  if (!data.case_risk_relevance) data.case_risk_relevance = [];
  if (!Array.isArray(data.case_risk_relevance)) {
    if (typeof data.case_risk_relevance === 'object') data.case_risk_relevance = [data.case_risk_relevance];
    else data.case_risk_relevance = [];
  }
}

const results = await runSubagentReview({
  name: 'case-relation',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['summary', 'relatedRisks', 'relatedAttackTools'],
  model: 'multi',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
