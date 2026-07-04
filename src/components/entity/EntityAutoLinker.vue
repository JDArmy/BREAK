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
 *
 * 核心 DOM 扫描逻辑提取至 autoLinkerCore.ts，便于单元测试覆盖。
 */
import { onMounted, onUnmounted, ref, computed, nextTick } from "vue";
import { useEntityResolver, type EntitySummary } from "@/composables/useEntityResolver";
import EntityPopoverContent from "./EntityPopoverContent.vue";
import {
  ATTR,
  CLS,
  INTERACTIVE_SELECTOR,
  EXCLUDE_ZONE,
  extractEntityId,
  processTextNode,
  scanSubtree,
} from "./autoLinkerCore";

// ─── 配置 ───────────────────────────────────────────────
/** 已标记文本节点的 WeakSet，防止重复处理 */
const processed = new WeakSet<Text>();

// ─── Popover 状态 ─────────────────────────────────────
const popoverVisible = ref(false);
const popoverEntity = ref<EntitySummary | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const { resolve } = useEntityResolver();

let showTimer: ReturnType<typeof setTimeout> | null = null;

function showPopover(el: HTMLElement, id: string) {
  const entity = resolve(id);
  if (!entity) return;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (showTimer) clearTimeout(showTimer);
  showTimer = setTimeout(() => {
    popoverEntity.value = entity;
    triggerRef.value = el;
    popoverVisible.value = true;
  }, 150);
}

function cancelShow() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

function scheduleHide() {
  cancelShow();
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

// ─── MutationObserver ─────────────────────────────────
let observer: MutationObserver | null = null;
let scanTimer: ReturnType<typeof setTimeout> | null = null;

let pendingMutations: MutationRecord[] = [];
// 批次大小阈值：高频 DOM 变动页面（如关系图渲染）mutation 会快速积压，
// 超过阈值时立即 flush，避免 100ms debounce 窗口内积压过多导致处理卡顿。
const MUTATION_BATCH_LIMIT = 500;

function processBatch() {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
  const batch = pendingMutations;
  pendingMutations = [];
  for (const mutation of batch) {
    if (mutation.type === "childList") {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          processTextNode(node as Text, processed);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          scanSubtree(node, processed);
        }
      }
    } else if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
      processed.delete(mutation.target as Text);
      processTextNode(mutation.target as Text, processed);
    }
  }
}

function handleMutations(mutations: MutationRecord[]) {
  pendingMutations.push(...mutations);
  // 超过批次阈值立即 flush，否则 100ms debounce
  if (pendingMutations.length >= MUTATION_BATCH_LIMIT) {
    processBatch();
    return;
  }
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = setTimeout(processBatch, 100);
}

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
  // 若内部已有路径 A 包裹的 span，则跳过（由路径 A 逐个处理）
  const interactive = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
  if (interactive) {
    if (interactive.querySelector(`.${CLS}`)) return;
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
    scanSubtree(root, processed);
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
  if (showTimer) clearTimeout(showTimer);

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
