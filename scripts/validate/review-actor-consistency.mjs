// B 类 subagent 交叉判断：ThreatActor 的 buildAttackTools/useAttackTools 划分一致性
// 规则：actor_tool_consistency — 自建 vs 使用工具划分是否合理，与 risks 是否一致

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, loadRelatedEntities } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

let items;
if (opts.full) {
  items = loadAllEntities('threat-actors').map((r) => ({ key: r.key, type: 'threat-actors', entity: r.entity }));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef });
  items = changed
    .filter((c) => c.type === 'threat-actors' && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: 'threat-actors', entity: c.entity }));
}
if (opts.type && opts.type !== 'threat-actors') items = [];
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

function prepareContext(item) {
  const { entity } = item;
  const buildTools = loadRelatedEntities('attack-tools', entity.buildAttackTools || [], ['title', 'description']);
  const useTools = loadRelatedEntities('attack-tools', entity.useAttackTools || [], ['title', 'description']);
  const directRisks = loadRelatedEntities('risks', entity.directCauseRisks || [], ['title', 'definition']);
  return { ...item, buildTools, useTools, directRisks };
}

function buildPrompt(item) {
  const { entity, buildTools, useTools, directRisks } = item;
  const sys = `你是 BREAK 知识库的威胁行为者关系评审员。结合自建/使用工具及关联风险的实际内容，判定划分是否合理。
严格规则：
1. 只输出 JSON 对象。
2. actor_tool_consistency：
   - buildAttackTools（自建工具）：这些工具是否真是该行为者会自建的？
   - useAttackTools（使用工具）：是否真是该行为者会使用的？
   - overlap：build 与 use 是否有不当重叠
3. actor_risks_consistency：directCauseRisks 是否与该行为者能力匹配。
4. verdict：pass/review/fail。fail=明显错划；review=可补强；pass=合理。
5. reason: 一句话。suggestions: 数组。`;
  const buildList = (buildTools || []).map((t) => `- ${t.key} ${t.title}：${String(t.fields.description || '').slice(0, 60)}`).join('\n');
  const useList = (useTools || []).map((t) => `- ${t.key} ${t.title}：${String(t.fields.description || '').slice(0, 60)}`).join('\n');
  const riskList = (directRisks || []).map((r) => `- ${r.key} ${r.title}`).join('\n');
  const user = `【威胁行为者】${item.key} ${entity.title}
【description】${String(entity.description || '').slice(0, 300)}

【buildAttackTools（自建）】
${buildList || '（无）'}

【useAttackTools（使用）】
${useList || '（无）'}

【directCauseRisks】
${riskList || '（无）'}

请判定工具划分是否合理，输出 JSON。`;
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
}

const results = await runSubagentReview({
  name: 'actor-consistency',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['description', 'buildAttackTools', 'useAttackTools', 'directCauseRisks'],
  model: 'multi',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
