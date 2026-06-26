<script setup lang="ts">
/**
 * 全局实体 ID 自动识别器。
 *
 * 两条路径覆盖全站所有实体 ID：
 *
 * 路径 A — 纯文本场景（description / definition 等）：
 *   MutationObserver → TreeWalker → 拆分文本节点 → <span data-entity-id>
 *
 * 路径 B — 交互元素场景（按钮 / 链接 / 表格行 / 卡片 等）：
 *   事件委托 mouseenter → 从元素文本中正则提取第一个实体 ID → 显示 Popover
 *   不修改 DOM，不影响已有点击行为
 *
 * 在 App.vue 中引入即可，零模板修改。
 */
import { onMounted, onUnmounted, ref, computed, nextTick } from "vue";
import { useEntityResolver, type EntitySummary } from "@/composables/useEntityResolver";
import EntityPopoverContent from "./EntityPopoverContent.vue";
import { ENTITY_ID_PATTERN, inferEntityType } from "@/utils/entityRoute";

// ─── 配置 ───────────────────────────────────────────────
/** 已标记文本节点的 WeakSet，防止重复处理 */
const processed = new WeakSet<Text>();
/** 标记属性 */
const ATTR = "data-entity-id";
/** 自动添加的 CSS 类 */
const CLS = "entity-id-auto";

// ─── Popover 状态 ─────────────────────────────────────
const popoverVisible = ref(false);
const popoverEntity = ref<EntitySummary | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const { resolve } = useEntityResolver();

function showPopover(el: HTMLElement, id: string) {
  const entity = resolve(id);
  if (!entity) return;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  popoverEntity.value = entity;
  triggerRef.value = el;
  popoverVisible.value = true;
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    popoverVisible.value = false;
    popoverEntity.value = null;
    triggerRef.value = null;
  }, 200);
}

function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

// ─── 虚拟触发 ref ─────────────────────────────────────
const virtualRef = computed(() => triggerRef.value);

// ─── 路径 B：从交互元素的文本中提取第一个实体 ID ──────
/**
 * 交互元素选择器列表。
 * mouseenter 到这些元素上时，尝试从 textContent 中提取实体 ID 显示 Popover。
 * 不修改 DOM，不影响原有 click 行为。
 */
const INTERACTIVE_SELECTORS = [
  // 抽屉 / 各 View 关联实体链接（button/a）
  ".entity-link",
  // EntityLinkSection 表格 ID 列
  ".entity-reference-link",
  // 列表左侧的 ID span
  ".knowledge-id",
  // 风险关联卡片标题
  ".risk-relation-title",
  // 攻击工具关联卡片标题
  ".attack-tool-relation-title",
  // 规避手段关联卡片标题
  ".avoidance-relation-title",
  // 威胁行为者关联卡片标题
  ".threat-actor-relation-title",
  // 关系图抽屉：节点头部 ID
  ".node-detail-id",
  // 关系图抽屉：关系列表中的关联节点 ID
  ".node-relation-link-id",
  // 关系图抽屉：相关实体块中的 ID
  ".node-related-entity-id",
];
const INTERACTIVE_SELECTOR = INTERACTIVE_SELECTORS.join(",");

/**
 * 从元素文本中提取第一个有效实体 ID。
 * 文本格式通常为 "R0001: 标题" 或 "关系类型 · R0001: 标题"。
 */
function extractEntityId(text: string): string | null {
  const regex = new RegExp(ENTITY_ID_PATTERN.source, "g");
  const match = regex.exec(text);
  if (!match) return null;
  const id = match[1];
  return inferEntityType(id) ? id : null;
}

// ─── 路径 A：DOM 扫描逻辑 ────────────────────────────
/**
 * 判断文本节点是否在"不应拆分包裹"的祖先内。
 * 交互元素内的 ID 由路径 B 的事件委托处理，无需拆分 DOM。
 */
function isInsideSkipZone(node: Node): boolean {
  let parent = node.parentElement;
  while (parent) {
    const tag = parent.tagName;
    // 交互元素：由路径 B 处理
    if (
      tag === "A" ||
      tag === "BUTTON" ||
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT"
    ) {
      return true;
    }
    // 代码块 / canvas 容器
    if (tag === "CODE" || tag === "PRE" || tag === "CANVAS") return true;
    // 已包裹 / Popover 自身 / 下拉列表 / ECharts / 特殊展示区
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
      parent.classList.contains("el-scrollbar") ||
      parent.classList.contains("network-chart") ||
      parent.classList.contains("sankey-chart") ||
      parent.classList.contains("detail-id") ||
      parent.classList.contains("knowledge-id")
    ) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/** 扫描单个文本节点，将其中的实体 ID 包裹为 <span> */
function processTextNode(textNode: Text): boolean {
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
function scanSubtree(root: Node) {
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
    processTextNode(tn);
  }
}

// ─── MutationObserver ─────────────────────────────────
let observer: MutationObserver | null = null;
let scanTimer: ReturnType<typeof setTimeout> | null = null;

function handleMutations(mutations: MutationRecord[]) {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node as Text);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            scanSubtree(node);
          }
        }
      } else if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
        processed.delete(mutation.target as Text);
        processTextNode(mutation.target as Text);
      }
    }
  }, 100);
}

/** 排除区域：下拉列表、Popover 自身、ECharts 图表等不应触发 Popover 的区域 */
const EXCLUDE_ZONE = ".el-select-dropdown, .el-autocomplete-suggestion, .el-popover, .entity-popover, .entity-card, [_echarts_instance_], .network-chart, .sankey-chart";

// ─── 事件委托（路径 A + B 统一入口） ──────────────────
function handleMouseEnter(e: Event) {
  const target = e.target as HTMLElement;
  if (!target?.tagName) return;

  // 排除下拉列表等区域
  if (target.closest(EXCLUDE_ZONE)) return;

  // 路径 A：文本节点中自动包裹的 span
  if (target.classList.contains(CLS)) {
    const id = target.getAttribute(ATTR);
    if (id) showPopover(target, id);
    return;
  }

  // 路径 B：交互元素（按钮 / 链接 / 表格 / 卡片）
  const interactive = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
  if (interactive) {
    const text = interactive.textContent || "";
    const id = extractEntityId(text);
    if (id) showPopover(interactive, id);
  }
}

function handleMouseLeave(e: Event) {
  const target = e.target as HTMLElement;
  if (!target?.tagName) return;

  // 路径 A
  if (target.classList.contains(CLS)) {
    scheduleHide();
    return;
  }

  // 路径 B
  if (target.closest(INTERACTIVE_SELECTOR)) {
    scheduleHide();
  }
}

// ─── 生命周期 ──────────────────────────────────────────
onMounted(() => {
  // 监听 document.body 而非 #app：
  // el-drawer / el-dialog 的 append-to-body 会把 DOM teleport 到 <body> 下，
  // 如果只监听 #app 就收不到抽屉内的事件和 DOM 变化。
  const root = document.body;

  // 初始扫描
  nextTick(() => {
    scanSubtree(root);
  });

  // 观察 DOM 变化
  observer = new MutationObserver(handleMutations);
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // 事件委托（capture 阶段，确保在组件事件之前触发）
  root.addEventListener("mouseenter", handleMouseEnter, true);
  root.addEventListener("mouseleave", handleMouseLeave, true);
});

onUnmounted(() => {
  observer?.disconnect();
  if (scanTimer) clearTimeout(scanTimer);
  if (hideTimer) clearTimeout(hideTimer);

  const root = document.body;
  root.removeEventListener("mouseenter", handleMouseEnter, true);
  root.removeEventListener("mouseleave", handleMouseLeave, true);
});
</script>

<template>
  <!-- 全局单例 Popover：虚拟触发 -->
  <el-popover
    v-if="virtualRef"
    :visible="popoverVisible"
    :virtual-ref="virtualRef"
    virtual-triggering
    placement="top"
    :width="320"
    :show-arrow="true"
    :offset="8"
    popper-class="entity-popover"
    :teleported="true"
  >
    <div
      @mouseenter="cancelHide"
      @mouseleave="scheduleHide"
    >
      <EntityPopoverContent
        v-if="popoverEntity"
        :entity="popoverEntity"
      />
    </div>
  </el-popover>
</template>
