// B 类 subagent 交叉判断运行器
// 与 llm-review-runner 的区别：每个评审项在调 LLM 前，先由 prepareContext(item) 注入
// "知识库已有相关实体内容"，使 LLM 能基于这些内容做语义交叉判断（而非孤立看单实体）。
// 这就是"subagent 结合知识库已有实体内容交叉判断"的脚本化实现：
//   - 主进程通过 llm-review-helpers.loadRelatedEntities 等加载相关实体内容
//   - 拼入 prompt 上下文
//   - worker 池调 LLM（多模型：跨实体交叉用 multi）
//
// 用法：
//   const results = await runSubagentReview({
//     name: 'risk-avoidance',
//     items: [{key, type, entity}],
//     prepareContext: async (item) => ({...item, relatedAvoidances: loadRelatedEntities(...)}),
//     buildPrompt: (item) => [...],   // item 含 related* 字段
//     validateResult, fingerprintFields, model: 'multi',
//   });

import { runReview, exitCodeFor } from './llm-review-runner.mjs';

function nowForLog() {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

/**
 * 运行 subagent 交叉判断评审
 * @param {{
 *   name: string,
 *   items: Array,
 *   prepareContext: (item) => Promise<item> | item,  — 注入 related* 等上下文字段
 *   buildPrompt: (item) => messages,                 — item 已含 prepareContext 返回的字段
 *   validateResult: (data, item) => void,
 *   fingerprintFields: string[],                      — 指纹字段（建议含 entity 内容字段；related 内容变化也应触发重评，可加入 fingerprintRelatedKeys）
 *   model?: string,                                   — 默认 'multi'（跨实体交叉用重型模型）
 *   concurrency?: number,
 *   limit?: number,
 *   extraReport?: (all, mdLines) => void,
 * }} opts
 */
export async function runSubagentReview(opts) {
  const { prepareContext, ...rest } = opts;
  const enrichedItems = [];
  console.log(`[${nowForLog()}] [${rest.name}] 准备上下文 ${rest.items.length} 项`);
  let index = 0;
  for (const item of rest.items) {
    index++;
    try {
      console.log(`[${nowForLog()}] [${rest.name}] 上下文 ${index}/${rest.items.length} ${item.key}`);
      const enriched = await (prepareContext ? prepareContext(item) : item);
      enrichedItems.push(enriched);
    } catch (e) {
      console.warn(`[${nowForLog()}] [${rest.name}] 上下文加载失败 ${item.key}: ${e.message}`);
      // 上下文加载失败的仍放入，buildPrompt 需容错处理无 related 的情况
      enrichedItems.push({ ...item, _contextError: String(e.message).slice(0, 200) });
    }
  }
  console.log(`[${nowForLog()}] [${rest.name}] 上下文准备完成 ${enrichedItems.length}/${rest.items.length}`);
  rest.items = enrichedItems;
  rest.model = rest.model || 'multi';
  return runReview(rest);
}

export { exitCodeFor };
