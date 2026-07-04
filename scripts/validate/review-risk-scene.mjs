// B 类 subagent 交叉判断：新风险是否应加入其他业务场景
// 规则：risk_other_business_scene — 读 Risk 内容 + 全库 BS 的 RS 语义，判断是否应加入其他专题 BS

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, loadBusinessScenes } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));

let items;
if (opts.full) {
  items = loadAllEntities('risks').map((r) => ({ key: r.key, type: 'risks', entity: r.entity }));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef });
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

// 加载全库 BS 原始结构（含每个 RS 的 risks 列表），供判断当前归属 + 应加场景
function loadBusinessScenesWithRisks() {
  const records = loadAllEntities('businessScenes');
  return records.map(({ key, entity }) => ({
    bsId: key,
    bsTitle: entity.title,
    riskScenes: Object.entries(entity.riskScenes || {}).map(([rsId, rs]) => ({
      rsId,
      rsTitle: rs.title,
      risks: rs.risks || [],
    })),
  }));
}

function prepareContext(item) {
  const businessScenes = loadBusinessScenesWithRisks();
  // 找出当前 Risk 已在哪些 BS/RS
  const currentScenes = [];
  // 子风险（key 含 -）靠父覆盖：若父风险已在某 RS，则子风险视为已归入（CLAUDE.md 规则：
  // riskScenes[].risks 只列父风险，前端 useSubRiskToggle 自动展开子风险）
  const parentKey = item.key.includes('-') ? item.key.split('-')[0] : null;
  for (const bs of businessScenes) {
    for (const rs of bs.riskScenes) {
      const direct = rs.risks.includes(item.key);
      const viaParent = parentKey && rs.risks.includes(parentKey);
      if (direct || viaParent) {
        const via = direct ? '' : '（靠父覆盖）';
        currentScenes.push(`${bs.bsId}/${rs.rsId}(${bs.bsTitle}/${rs.rsTitle})${via}`);
      }
    }
  }
  return { ...item, businessScenes, currentScenes };
}

function buildPrompt(item) {
  const { entity, businessScenes, currentScenes } = item;
  const sys = `你是 BREAK 知识库的风险业务场景归类评审员。结合全库业务场景结构与该风险当前已归的场景，判定是否应加入其他业务场景。
严格规则：
1. 只输出 JSON 对象。
2. currentCoverageReasonable：当前归类是否合理。
3. shouldAddOtherScenes：该风险是否应加入其他专题 BS（除已归的外）？给具体 bsId + rsId + reason。
   - 专题 BS 如 BS14(AI)、BS16(IoT)、BS19(具身智能)、BS01(金融)、BS02(电商) 等
4. verdict：pass(当前归类合理无需加)/review(建议加其他场景)/fail(明显漏归到应属的主场景)。
5. reason: 一句话。suggestions: 数组。`;
  const bsList = (businessScenes || [])
    .map((bs) => `${bs.bsId} ${bs.bsTitle}：${bs.riskScenes.map((rs) => `${rs.rsId}(${rs.rsTitle})`).slice(0, 8).join(', ')}`)
    .join('\n');
  const user = `【风险】${item.key} ${entity.title}
【definition】${entity.definition || ''}
【description】${String(entity.description || '').slice(0, 300)}

【当前已归入的业务场景】
${currentScenes.length ? currentScenes.join(', ') : '（无，未归入任何场景——可能需补归 BS00 全场景）'}

【全库业务场景结构】
${bsList}

请判定该风险是否应加入其他业务场景，输出 JSON。`;
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
