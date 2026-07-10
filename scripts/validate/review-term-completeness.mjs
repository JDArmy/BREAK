// B 类 subagent 交叉判断：Term 的 related* 关联完整性
// 规则：term_related_completeness — Term 定义 + 全库相关实体，判断 related* 是否漏挂应有的关联

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, loadRelatedEntities } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';
import { projectRoot, readJson } from '../search/common.mjs';

const termCategoryRegistry = readJson(`${projectRoot}/src/BREAK/term-categories/termCategories.json`);

const opts = parseArgs(process.argv.slice(2));

let items;
if (opts.full) {
  items = loadAllEntities('terms').map((r) => ({ key: r.key, type: 'terms', entity: r.entity }));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
  items = changed
    .filter((c) => c.type === 'terms' && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: 'terms', entity: c.entity }));
}
if (opts.type && opts.type !== 'terms') items = [];
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

function prepareContext(item) {
  const { entity } = item;
  const relatedRisks = loadRelatedEntities('risks', entity.relatedRisks || [], ['title', 'definition']);
  const relatedAvoidances = loadRelatedEntities('avoidances', entity.relatedAvoidances || [], ['title', 'definition']);
  const relatedAttackTools = loadRelatedEntities('attack-tools', entity.relatedAttackTools || [], ['title', 'description']);
  const relatedThreatActors = loadRelatedEntities('threat-actors', entity.relatedThreatActors || [], ['title', 'description']);
  return { ...item, relatedRisks, relatedAvoidances, relatedAttackTools, relatedThreatActors };
}

function buildPrompt(item) {
  const { entity, relatedRisks, relatedAvoidances, relatedAttackTools, relatedThreatActors } = item;
  const sys = `你是 BREAK 知识库的术语关联评审员。结合该术语定义及已关联实体的实际内容，判断 related* 是否漏挂应有的关联。
重要语义：BREAK 知识库中 Avoidance 是"防御/风控/检测手段"（不是攻击方的规避手段）。Term.relatedAvoidances 指"与该术语相关的防御手段"。例如"代发"（黑产物流伪装）的 relatedAvoidances 应是检测/处置代发的措施（定向抽检、店铺处罚等），而非攻击工具。
严格规则：
1. 只输出 JSON 对象。
2. currentRelationsReasonable：当前 related* 是否合理（有无错挂）。
   - relatedAvoidances 错挂：挂了与该术语**毫无防御关系**的实体（如把攻击工具/数据泄露事件挂到 relatedAvoidances，或挂了与术语业务领域完全不相关的 Avoidance）。
   - **通用但相关的 Avoidance 不算错挂**：A0054 合规治理、A0044 依法打击、A0016 威胁情报、A0077 交易风险监控等通用风控手段，只要与该术语的业务领域有间接防御关系，就视为合理（review 级可优化，不构成 fail）。例如"房信企"（骗贷）挂"合规治理/依法打击"虽不具体但相关，不算 fail。
   - 与该术语有具体检测/处置关系的 Avoidance 不算错挂（如"代发"挂"定向抽检"合理）。
   - relatedRisks 错挂：挂了与术语语义**完全不匹配**的风险（如"盒饭"冒充采购骗局挂"杀猪盘投资诈骗"——业务模式不同）。
3. missingRelations：根据术语定义，应关联但未关联的实体类型（给类型描述，不给具体 ID）。
4. verdict：pass/review/fail。
   - **fail=明显错挂**：relatedRisks 挂了语义完全不匹配的风险，或 relatedAvoidances 挂了毫无关系的实体（如攻击工具/数据事件）。通用风控手段过宽只算 review，不算 fail。
   - review=可补强（通用项可换更具体，或漏挂可补）。
   - pass=合理。
5. reason: 一句话。suggestions: 数组。`;
  const fmt = (list) => (list || []).map((r) => `- ${r.key} ${r.title}`).join('\n');
  const category = termCategoryRegistry.categories?.[entity.category];
  const user = `【术语】${item.key} ${entity.title}
【category】${entity.category}（${category?.title || '未知分类'}：${category?.description || '注册表无说明'}）
【definition】${entity.definition || ''}
【description】${String(entity.description || '').slice(0, 200)}

【已关联风险】
${fmt(relatedRisks) || '（无）'}
【已关联规避手段】
${fmt(relatedAvoidances) || '（无）'}
【已关联攻击工具】
${fmt(relatedAttackTools) || '（无）'}
【已关联威胁行为者】
${fmt(relatedThreatActors) || '（无）'}

请判断 related* 是否漏挂，输出 JSON。`;
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
  name: 'term-completeness',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['definition', 'description', 'relatedRisks', 'relatedAvoidances'],
  model: 'multi',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
