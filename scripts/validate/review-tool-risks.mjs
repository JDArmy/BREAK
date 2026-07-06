// B 类 subagent 交叉判断：AttackTool 的 directCause/indirectSupport 划分 + 规避手段覆盖
// 规则：
//   tool_risks_classification — directCauseRisks/indirectSupportRisks 划分是否正确
//   tool_avoidance_coverage   — 是否漏加规避手段

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, loadRelatedEntities, loadAvoidancesByCategory } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

let items;
if (opts.full) {
  items = loadAllEntities('attack-tools').map((r) => ({ key: r.key, type: 'attack-tools', entity: r.entity }));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
  items = changed
    .filter((c) => c.type === 'attack-tools' && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: 'attack-tools', entity: c.entity }));
}
if (opts.type && opts.type !== 'attack-tools') items = [];
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

function prepareContext(item) {
  const { entity } = item;
  const directRisks = loadRelatedEntities('risks', entity.directCauseRisks || [], ['title', 'definition']);
  const indirectRisks = loadRelatedEntities('risks', entity.indirectSupportRisks || [], ['title', 'definition']);
  const relatedAvoidances = loadRelatedEntities('avoidances', entity.avoidances || [], ['title', 'category', 'definition']);
  const avoidancesByCat = loadAvoidancesByCategory();
  return { ...item, directRisks, indirectRisks, relatedAvoidances, avoidancesByCat };
}

function buildPrompt(item) {
  const { entity, directRisks, indirectRisks, relatedAvoidances, avoidancesByCat } = item;
  const sys = `你是 BREAK 知识库的攻击工具关系评审员。结合关联风险/规避手段的实际内容，判定关系划分是否正确。
重要原则：directCauseRisks（直接造成）与 indirectSupportRisks（间接支持）的划分有**合理争议空间**——一个工具既可能"直接实施"某风险，也可能"间接支持"它，取决于视角。**只有在明显且无争议的错划时才判 fail**，且 fail 必须给出具体证据（满足以下任一）：
  (a) 风险定义与工具描述**完全不匹配**（如把"洗钱"风险挂到"GPS伪造"工具的 directCauseRisks——GPS伪造不实施洗钱）
  (b) 工具的核心功能（description 明确说明）就是**直接实施**某风险，却被标为 indirectSupportRisks（如"打码平台"核心是绕过验证码，R0047人机识别绕过应是 direct 而非 indirect）
不满足上述举证要求的，一律判 review（可优化但不构成错误）。边界情况、可论证的划分、有辅助作用的关联，判 review。
严格规则：
1. 只输出 JSON 对象。
2. tool_risks_classification：逐一判断 directCauseRisks 和 indirectSupportRisks 划分。
   - correct: true/false
   - evidence_for_fail：若 correct=false 且建议 fail，必须引用风险定义/工具描述的具体片段作为证据
   - 仅当满足上述 (a) 或 (b) 才标 correct:false 并建议 fail；否则 correct:true 但可给 review 建议
3. tool_avoidance_coverage：是否漏加规避手段？给候选（从 avoidancesByCat 找）。
4. verdict：pass/review/fail。
   - fail：仅限满足 (a) 或 (b) 的明显无争议错划
   - review：划分有争议可优化，但不构成错误
   - pass：划分合理
5. reason: 一句话。suggestions: 数组。`;
  const directList = (directRisks || []).map((r) => `- ${r.key} ${r.title}：${String(r.fields.definition || '').slice(0, 60)}`).join('\n');
  const indirectList = (indirectRisks || []).map((r) => `- ${r.key} ${r.title}：${String(r.fields.definition || '').slice(0, 60)}`).join('\n');
  const avList = (relatedAvoidances || []).map((a) => `- ${a.key} [${a.fields.category}] ${a.title}`).join('\n');
  const candidateList = Object.entries(avoidancesByCat || {})
    .map(([cat, list]) => `${cat}: ${list.slice(0, 10).map((a) => `${a.key}(${a.title})`).join(', ')}`)
    .join('\n');
  const user = `【攻击工具】${item.key} ${entity.title}
【description】${String(entity.description || '').slice(0, 300)}

【directCauseRisks（直接造成）】
${directList || '（无）'}

【indirectSupportRisks（间接支持）】
${indirectList || '（无）'}

【当前 avoidances】
${avList || '（无）'}

【全库 Avoidance 候选（按 AC 分类，节选）】
${candidateList}

请判定风险划分是否正确、是否漏加规避手段，输出 JSON。`;
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
  if (!data.tool_risks_classification) data.tool_risks_classification = [];
  if (!Array.isArray(data.tool_risks_classification)) {
    if (typeof data.tool_risks_classification === 'object') data.tool_risks_classification = [data.tool_risks_classification];
    else data.tool_risks_classification = [];
  }
}

const results = await runSubagentReview({
  name: 'tool-risks',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['description', 'directCauseRisks', 'indirectSupportRisks', 'avoidances'],
  model: 'multi',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
