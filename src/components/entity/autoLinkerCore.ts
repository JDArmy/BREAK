/**
 * EntityAutoLinker 核心 DOM 扫描逻辑。
 *
 * 从 EntityAutoLinker.vue 提取的纯 DOM 函数，用于：
 * - 文本节点中实体 ID 的识别与包裹
 * - Skip zone 判断（跳过表单、代码块、ECharts、下拉列表等区域）
 * - DOM 子树扫描
 *
 * 隔离副作用（MutationObserver / 事件委托 / Popover 状态）与纯逻辑，
 * 便于单元测试覆盖 skip zone 边界和扫描性能。
 */

import { ENTITY_ID_PATTERN, inferEntityType } from "@/utils/entityRoute";

// ─── 常量 ───────────────────────────────────────────────
/** 标记属性 */
export const ATTR = "data-entity-id";
/** 自动添加的 CSS 类 */
export const CLS = "entity-id-auto";

/**
 * 交互元素选择器列表。
 * 这些容器里的实体 ID 允许被扫描包裹，hover 时只响应具体 ID 文本。
 */
export const INTERACTIVE_SELECTORS = [
  // 抽屉 / 各 View 关联实体链接（button/a）
  ".entity-link",
  // EntityLinkSection 表格 ID 列
  ".entity-reference-link",
  // 知识库列表项与其中的 ID span
  ".knowledge-list-item",
  ".knowledge-id",
  // 风险关联卡片标题
  ".risk-relation-item",
  ".risk-relation-title",
  // 攻击工具关联卡片标题
  ".attack-tool-relation-item",
  ".attack-tool-relation-title",
  // 规避手段关联卡片标题
  ".avoidance-relation-item",
  ".avoidance-relation-title",
  // 威胁行为者关联卡片标题
  ".threat-actor-relation-item",
  ".threat-actor-relation-title",
  // 关系图抽屉：节点头部 ID
  ".node-detail-title",
  ".node-detail-id",
  // 关系图抽屉：关系列表中的关联节点 ID
  ".node-relation-link",
  ".node-relation-link-id",
  // 关系图抽屉：相关实体块中的 ID
  ".node-related-entity-main",
  ".node-related-entity-id",
  // 关系图抽屉：防御覆盖列表项（div[role=button]，含 ID span）
  ".node-coverage-item",
  // 关系图抽屉：攻击路径实体项
  ".node-attack-entity",
  // 防御覆盖视角：规避覆盖列表项（button）
  ".relation-analysis-coverage-item",
  // 防御覆盖视角：路径列表项（button）
  ".relation-analysis-path-list-item",
  // 防御覆盖视角：路径段中的实体
  ".relation-analysis-segment-main",
  // 防御覆盖视角：路径节点
  ".relation-analysis-path-node",
];
export const INTERACTIVE_SELECTOR = INTERACTIVE_SELECTORS.join(",");

/** 排除区域：下拉列表、选择器、Popover 自身、ECharts 图表等不应触发 Popover 的区域 */
export const EXCLUDE_ZONE =
  ".el-select-dropdown, .el-autocomplete-suggestion, .el-select-v2, .el-select, .el-input, .el-popover, .entity-popover, .entity-card, [_echarts_instance_], .network-chart, .sankey-chart";

// ─── 纯函数 ─────────────────────────────────────────────

/**
 * 判断文本节点是否在"不应拆分包裹"的祖先内。
 *
 * 对 <a> / <button>：若祖先匹配 INTERACTIVE_SELECTOR，
 * 则允许路径 A 进入扫描（处理内含多个 ID 的场景）。
 * 否则跳过，避免改写普通导航链接 / 普通按钮。
 */
export function isInsideSkipZone(node: Node): boolean {
  let parent = node.parentElement;
  while (parent) {
    const tag = parent.tagName;
    // 表单元素：始终跳过
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return true;
    }
    // <a> / <button>：若匹配允许扫描的交互容器则放行，否则跳过
    if (tag === "A" || tag === "BUTTON") {
      return !parent.closest(INTERACTIVE_SELECTOR);
    }
    // 代码块 / canvas 容器
    if (tag === "CODE" || tag === "PRE" || tag === "CANVAS") return true;
    // 已包裹 / Popover 自身 / 下拉列表 / 选择器 / ECharts / 特殊展示区
    if (
      parent.hasAttribute(ATTR) ||
      parent.hasAttribute("_echarts_instance_") ||
      parent.classList.contains(CLS) ||
      parent.classList.contains("el-popover") ||
      parent.classList.contains("entity-popover") ||
      parent.classList.contains("entity-card") ||
      parent.classList.contains("el-select-dropdown") ||
      parent.classList.contains("el-autocomplete-suggestion") ||
      parent.classList.contains("el-select-dropdown__item") ||
      parent.classList.contains("el-select-v2") ||
      parent.classList.contains("el-select") ||
      parent.classList.contains("el-input") ||
      parent.classList.contains("network-chart") ||
      parent.classList.contains("sankey-chart") ||
      parent.classList.contains("detail-id")
    ) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * 从元素文本中提取第一个有效实体 ID。
 * 文本格式通常为 "R0001: 标题" 或 "关系类型 · R0001: 标题"。
 */
export function extractEntityId(text: string): string | null {
  const regex = new RegExp(ENTITY_ID_PATTERN.source, "g");
  const match = regex.exec(text);
  if (!match) return null;
  const id = match[1];
  return inferEntityType(id) ? id : null;
}

/** 扫描单个文本节点，将其中的实体 ID 包裹为 <span>。返回是否发生了替换。 */
export function processTextNode(
  textNode: Text,
  processed: WeakSet<Text>,
): boolean {
  if (processed.has(textNode)) return false;
  processed.add(textNode);

  const text = textNode.textContent;
  if (!text) return false;

  // 快速预检
  if (!/[RATC]\d{4}/.test(text)) return false;

  // 跳过不应拆分的区域
  if (isInsideSkipZone(textNode)) return false;

  const regex = new RegExp(ENTITY_ID_PATTERN.source, "g");
  const fragments: (string | { id: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let hasMatch = false;

  while ((match = regex.exec(text)) !== null) {
    const id = match[1];
    if (!inferEntityType(id)) continue;

    hasMatch = true;
    if (match.index > lastIndex) {
      fragments.push(text.slice(lastIndex, match.index));
    }
    fragments.push({ id });
    lastIndex = regex.lastIndex;
  }

  if (!hasMatch) return false;

  if (lastIndex < text.length) {
    fragments.push(text.slice(lastIndex));
  }

  // 用 DocumentFragment 替换原文本节点
  const frag = document.createDocumentFragment();
  for (const part of fragments) {
    if (typeof part === "string") {
      frag.appendChild(document.createTextNode(part));
    } else {
      const span = document.createElement("span");
      span.className = CLS;
      span.setAttribute(ATTR, part.id);
      span.textContent = part.id;
      frag.appendChild(span);
    }
  }

  textNode.parentNode?.replaceChild(frag, textNode);
  return true;
}

/** 扫描一个 DOM 子树中的所有文本节点 */
export function scanSubtree(
  root: Node,
  processed: WeakSet<Text>,
): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Text) {
      const text = node.textContent;
      if (!text || text.length < 5) return NodeFilter.FILTER_REJECT;
      if (processed.has(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    textNodes.push(current as Text);
  }

  for (const tn of textNodes) {
    processTextNode(tn, processed);
  }
}
