/**
 * EntityAutoLinker 核心 DOM 扫描逻辑。
 *
 * 从 EntityAutoLinker.vue 提取的纯 DOM 函数，用于：
 * - 文本节点中实体 ID、行业术语的识别与包裹
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
/** 自动链接文本的容器与 Vue 原始文本节点容器 */
export const TEXT_ROOT_CLS = "entity-auto-linked-text";
export const TEXT_SOURCE_CLS = "entity-auto-link-source";
export const TEXT_RENDERED_CLS = "entity-auto-link-rendered";

export type TermSource = "title" | "alias" | "keyword";

export interface TermCandidate {
  id: string;
  text: string;
  source: TermSource;
}

export interface TermMatch {
  id: string;
  start: number;
  end: number;
}

export interface TermMatcher {
  find(text: string): TermMatch[];
}

interface ResolvedTerm {
  id: string;
  text: string;
  rank: number;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  terms: ResolvedTerm[];
}

const TERM_SOURCE_RANK: Record<TermSource, number> = {
  title: 0,
  alias: 1,
  keyword: 2,
};

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
      parent.classList.contains(TEXT_ROOT_CLS) ||
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

function isAsciiWordChar(char: string | undefined): boolean {
  return Boolean(char && /[A-Za-z0-9_]/.test(char));
}

function hasValidTermBoundary(text: string, start: number, end: number, term: string): boolean {
  const first = term[0];
  const last = term[term.length - 1];
  if (isAsciiWordChar(first) && isAsciiWordChar(text[start - 1])) return false;
  if (isAsciiWordChar(last) && isAsciiWordChar(text[end])) return false;
  return true;
}

/**
 * 构建术语匹配器。
 *
 * 同一词指向多个实体时按 title > alias > keyword 消解；若最高优先级仍有
 * 多个实体则放弃自动链接，避免把歧义词随机指向某一术语。
 */
export function createTermMatcher(candidates: TermCandidate[]): TermMatcher {
  const ownership = new Map<string, Map<string, ResolvedTerm>>();

  for (const candidate of candidates) {
    const text = candidate.text.trim();
    const length = Array.from(text).length;
    // 单字及过短英文极易在正文中误匹配；keywords 使用更严格的长度门槛。
    if (!text || length < 2 || (/^[\x00-\x7F]+$/.test(text) && length < 3)) continue;
    if (candidate.source === "keyword" && length < 3) continue;
    const exactEntityId = new RegExp(`^(?:${ENTITY_ID_PATTERN.source})$`).test(text);
    if (!/[\p{L}\p{N}]/u.test(text) || exactEntityId) continue;

    const normalized = text.toLocaleLowerCase();
    const byEntity = ownership.get(normalized) ?? new Map<string, ResolvedTerm>();
    const current = byEntity.get(candidate.id);
    const next = { id: candidate.id, text, rank: TERM_SOURCE_RANK[candidate.source] };
    if (!current || next.rank < current.rank) byEntity.set(candidate.id, next);
    ownership.set(normalized, byEntity);
  }

  const resolved: ResolvedTerm[] = [];
  for (const byEntity of ownership.values()) {
    const terms = Array.from(byEntity.values());
    const bestRank = Math.min(...terms.map((term) => term.rank));
    const best = terms.filter((term) => term.rank === bestRank);
    if (best.length === 1) resolved.push(best[0]);
  }

  const root: TrieNode = { children: new Map(), terms: [] };
  for (const term of resolved) {
    let node = root;
    for (const char of term.text.toLocaleLowerCase()) {
      let child = node.children.get(char);
      if (!child) {
        child = { children: new Map(), terms: [] };
        node.children.set(char, child);
      }
      node = child;
    }
    node.terms.push(term);
  }

  return {
    find(text: string): TermMatch[] {
      const normalized = text.toLocaleLowerCase();
      const matches: TermMatch[] = [];
      let cursor = 0;

      while (cursor < normalized.length) {
        let node = root;
        let index = cursor;
        let best: ResolvedTerm | null = null;
        let bestEnd = cursor;

        while (index < normalized.length) {
          const child = node.children.get(normalized[index]);
          if (!child) break;
          node = child;
          index += 1;
          for (const term of node.terms) {
            if (
              hasValidTermBoundary(text, cursor, index, term.text) &&
              (!best || term.text.length > best.text.length ||
                (term.text.length === best.text.length && term.rank < best.rank))
            ) {
              best = term;
              bestEnd = index;
            }
          }
        }

        if (best) {
          matches.push({ id: best.id, start: cursor, end: bestEnd });
          cursor = bestEnd;
        } else {
          cursor += 1;
        }
      }

      return matches;
    },
  };
}

/** 扫描单个文本节点，将其中的实体 ID 包裹为 <span>。返回是否发生了替换。 */
export function processTextNode(
  textNode: Text,
  processed: WeakSet<Text>,
  termMatcher?: TermMatcher,
): boolean {
  if (processed.has(textNode)) return false;
  processed.add(textNode);

  const text = textNode.textContent;
  if (!text) return false;

  const sourceHolder = textNode.parentElement?.classList.contains(TEXT_SOURCE_CLS)
    ? textNode.parentElement
    : null;

  // 首次扫描时可快速排除无实体 ID 的文本；已建立可见副本的源节点仍需刷新，
  // 包括新文本不再含任何匹配项的情况。
  if (!sourceHolder && !termMatcher && !/[RATC]\d{4}/.test(text)) return false;

  // 自动链接后仍保留 Vue 管理的原始文本节点。Vue 更新该节点时，
  // MutationObserver 会再次进入这里并刷新可见副本，避免 SPA 路由切换后文本陈旧。
  if (!sourceHolder && isInsideSkipZone(textNode)) return false;

  const regex = new RegExp(ENTITY_ID_PATTERN.source, "g");
  const matches: TermMatch[] = [];
  const occupiedRanges: Array<{ start: number; end: number }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const id = match[1];
    if (!inferEntityType(id)) continue;
    matches.push({ id, start: match.index, end: regex.lastIndex });
    occupiedRanges.push({ start: match.index, end: regex.lastIndex });
  }

  if (termMatcher) {
    for (const termMatch of termMatcher.find(text)) {
      const overlapsId = occupiedRanges.some(
        (range) => termMatch.start < range.end && termMatch.end > range.start,
      );
      if (!overlapsId) matches.push(termMatch);
    }
  }

  if (matches.length === 0) {
    const rendered = sourceHolder?.nextElementSibling;
    if (rendered?.classList.contains(TEXT_RENDERED_CLS)) {
      rendered.textContent = text;
      return true;
    }
    return false;
  }
  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const fragments: (string | { id: string; text: string })[] = [];
  for (const item of matches) {
    if (item.start < lastIndex) continue;
    if (item.start > lastIndex) fragments.push(text.slice(lastIndex, item.start));
    fragments.push({ id: item.id, text: text.slice(item.start, item.end) });
    lastIndex = item.end;
  }
  if (lastIndex < text.length) fragments.push(text.slice(lastIndex));

  const rendered = sourceHolder?.nextElementSibling;
  const renderedHolder =
    rendered?.classList.contains(TEXT_RENDERED_CLS) === true
      ? (rendered as HTMLElement)
      : document.createElement("span");
  renderedHolder.className = TEXT_RENDERED_CLS;
  renderedHolder.replaceChildren();

  for (const part of fragments) {
    if (typeof part === "string") {
      renderedHolder.appendChild(document.createTextNode(part));
    } else {
      const span = document.createElement("span");
      span.className = CLS;
      span.setAttribute(ATTR, part.id);
      span.textContent = part.text;
      renderedHolder.appendChild(span);
    }
  }

  if (!sourceHolder) {
    const parent = textNode.parentNode;
    if (!parent) return false;

    const root = document.createElement("span");
    root.className = TEXT_ROOT_CLS;
    const source = document.createElement("span");
    source.className = TEXT_SOURCE_CLS;
    source.hidden = true;
    source.setAttribute("aria-hidden", "true");

    parent.replaceChild(root, textNode);
    source.appendChild(textNode);
    root.append(source, renderedHolder);
  }

  return true;
}

/** 扫描一个 DOM 子树中的所有文本节点 */
export function scanSubtree(
  root: Node,
  processed: WeakSet<Text>,
  termMatcher?: TermMatcher,
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
    processTextNode(tn, processed, termMatcher);
  }
}
