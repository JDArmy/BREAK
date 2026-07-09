// B 类 subagent 交叉判断：新风险是否应加入其他业务域
// 规则：risk_other_business_domain — 读 Risk 内容 + 全库 BD 的 RS 语义，判断是否应加入其他专题 BD

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, loadBusinessDomains } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

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

// 加载全库 BD 原始结构（含每个 RS 的 risks 列表），供判断当前归属 + 应加业务域
function loadBusinessDomainsWithRisks() {
  const records = loadAllEntities('businessDomains');
  return records.map(({ key, entity }) => ({
    bdId: key,
    bdTitle: entity.title,
    riskScenes: Object.entries(entity.riskScenes || {}).map(([rsId, rs]) => ({
      rsId,
      rsTitle: rs.title,
      risks: rs.risks || [],
    })),
  }));
}

function prepareContext(item) {
  const businessDomains = loadBusinessDomainsWithRisks();
  // 找出当前 Risk 已在哪些 BD/RS
  const currentScenes = [];
  // 子风险（key 含 -）靠父覆盖：若父风险已在某 RS，则子风险视为已归入（CLAUDE.md 规则：
  // riskScenes[].risks 只列父风险，前端 useSubRiskToggle 自动展开子风险）
  const parentKey = item.key.includes('-') ? item.key.split('-')[0] : null;
  for (const bd of businessDomains) {
    for (const rs of bd.riskScenes) {
      const direct = rs.risks.includes(item.key);
      const viaParent = parentKey && rs.risks.includes(parentKey);
      if (direct || viaParent) {
        const via = direct ? '' : '（靠父覆盖）';
        currentScenes.push(`${bd.bdId}/${rs.rsId}(${bd.bdTitle}/${rs.rsTitle})${via}`);
      }
    }
  }
  return { ...item, businessDomains, currentScenes };
}

function buildPrompt(item) {
  const { entity, businessDomains, currentScenes } = item;
  const sys = `你是 BREAK 知识库的风险业务域归类评审员。结合全库业务域结构与该风险当前已归的业务域，判定是否应加入其他业务域。
严格规则：
1. 只输出 JSON 对象。
2. currentCoverageReasonable：当前归类是否合理。
3. shouldAddOtherScenes：该风险是否应加入其他专题 BD（除已归的外）？给具体 bdId + rsId + reason。
   - 专题 BD 如 BD14(AI)、BD16(IoT)、BD19(具身智能)、BD01(金融)、BD02(电商) 等
4. verdict：pass(当前归类合理无需加)/review(建议加其他业务域)/fail(明显漏归到应属的主业务域)。
5. reason: 一句话。suggestions: 数组。`;
  const bdList = (businessDomains || [])
    .map((domain) => `${domain.bdId} ${domain.bdTitle}：${domain.riskScenes.map((rs) => `${rs.rsId}(${rs.rsTitle})`).slice(0, 8).join(', ')}`)
    .join('\n');
  const user = `【风险】${item.key} ${entity.title}
【definition】${entity.definition || ''}
【description】${String(entity.description || '').slice(0, 300)}

【当前已归入的业务域】
${currentScenes.length ? currentScenes.join(', ') : '（无，未归入任何业务域——可能需补归 BD00 全域）'}

【全库业务域结构】
${bdList}

请判定该风险是否应加入其他业务域，输出 JSON。`;
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
  // shouldAddOtherScenes 接受任意类型，归一化成数组
  if (!data.shouldAddOtherScenes) {
    data.shouldAddOtherScenes = [];
  } else if (!Array.isArray(data.shouldAddOtherScenes)) {
    data.shouldAddOtherScenes = typeof data.shouldAddOtherScenes === 'object' ? [data.shouldAddOtherScenes] : [];
  }
}

const results = await runSubagentReview({
  name: 'risk-scene',
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
