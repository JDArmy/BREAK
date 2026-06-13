<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Search } from "@element-plus/icons-vue";
import { useSearch, type EntityType, type SearchResult } from "@/composables/useSearch";
import { useBreakpoints } from "@/composables/useBreakpoints";

import "element-plus/es/components/dialog/style/css";
import "element-plus/es/components/input/style/css";
import "element-plus/es/components/icon/style/css";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const router = useRouter();
const { t } = useI18n();
const { search: doSearch } = useSearch();
const { isMobile } = useBreakpoints();

const query = ref("");
const selectedIndex = ref(-1);
const inputRef = ref<InstanceType<typeof import("element-plus")["ElInput"]> | null>(null);

const emptyResults = () =>
  ({ risk: [], avoidance: [], attackTool: [], threatActor: [] }) as Record<
    EntityType,
    SearchResult[]
  >;

// 扁平化的所有结果（用于键盘导航索引）
const flatResults = computed(() => {
  const flat: (SearchResult & { groupIndex: number })[] = [];
  let groupIdx = 0;
  for (const type of ["risk", "avoidance", "attackTool", "threatActor"] as EntityType[]) {
    for (const r of resultsDebounced.value[type]) {
      flat.push({ ...r, groupIndex: groupIdx });
    }
    if (resultsDebounced.value[type].length > 0) groupIdx++;
  }
  return flat;
});

// 总结果数
const totalResults = computed(() => flatResults.value.length);

// 各类型标签
const groupLabels: Record<EntityType, string> = {
  risk: "search.groupRisk",
  avoidance: "search.groupAvoidance",
  attackTool: "search.groupAttackTool",
  threatActor: "search.groupThreatActor",
};

// 各类型对应的路由
const typeRoutes: Record<EntityType, string> = {
  risk: "/risks",
  avoidance: "/avoidances",
  attackTool: "/attack-tools",
  threatActor: "/threat-actors",
};

// 防抖搜索
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedQuery = ref("");
watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = val;
    selectedIndex.value = -1;
  }, 200);
});

// 用 debouncedQuery 触发实际搜索
const resultsDebounced = computed(() => {
  if (!debouncedQuery.value.trim()) return emptyResults();
  return doSearch(debouncedQuery.value);
});

// 高亮匹配文本
function highlightText(text: string, queryStr: string): string {
  if (!queryStr.trim()) return text;
  const escaped = queryStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// 选择搜索结果
function selectResult(result: SearchResult) {
  emit("update:modelValue", false);
  const route = typeRoutes[result.type];
  router.push({ path: route, hash: `#${result.id}` });
  query.value = "";
  debouncedQuery.value = "";
}

// 键盘导航
function handleKeydown(e: KeyboardEvent) {
  if (!props.modelValue) return;

  if (e.key === "Escape") {
    emit("update:modelValue", false);
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex.value = Math.min(selectedIndex.value + 1, flatResults.value.length - 1);
    scrollToSelected();
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, -1);
    scrollToSelected();
    return;
  }

  if (e.key === "Enter" && selectedIndex.value >= 0 && selectedIndex.value < flatResults.value.length) {
    e.preventDefault();
    selectResult(flatResults.value[selectedIndex.value]);
    return;
  }
}

function scrollToSelected() {
  nextTick(() => {
    const el = document.querySelector(".search-result-item.selected");
    el?.scrollIntoView({ block: "nearest" });
  });
}

// Dialog 打开时聚焦输入框
watch(() => props.modelValue, (open) => {
  if (open) {
    query.value = "";
    debouncedQuery.value = "";
    selectedIndex.value = -1;
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

// 全局快捷键 Cmd+K / Ctrl+K
function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    emit("update:modelValue", !props.modelValue);
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleGlobalKeydown);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleGlobalKeydown);
  document.removeEventListener("keydown", handleKeydown);
});

// 获取当前平台快捷键提示
const shortcutHint =
  typeof navigator !== "undefined" && navigator.platform?.includes("Mac")
    ? "⌘K"
    : "Ctrl+K";

// 触摸设备选中索引
function handleTouchStart(index: number) {
  selectedIndex.value = index;
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :show-close="false"
    :width="isMobile ? '92vw' : '640px'"
    :top="isMobile ? '8vh' : '15vh'"
    class="search-dialog"
    :append-to-body="true"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    @opened="inputRef?.focus()"
  >
    <!-- 搜索输入框 -->
    <div class="search-input-wrapper">
      <el-input
        ref="inputRef"
        v-model="query"
        :placeholder="t('search.placeholder')"
        size="large"
        clearable
        :prefix-icon="Search"
        class="search-input"
      />
      <span class="shortcut-hint">{{ shortcutHint }}</span>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="debouncedQuery.trim()">
      <template v-for="type in (['risk', 'avoidance', 'attackTool', 'threatActor'] as EntityType[])" :key="type">
        <div v-if="resultsDebounced[type]?.length" class="result-group">
          <div class="result-group-header">
            {{ t(groupLabels[type]) }}
            <span class="result-count">{{ resultsDebounced[type].length }}</span>
          </div>
          <div
            v-for="result in resultsDebounced[type]"
            :key="result.id"
            class="search-result-item"
            :class="{ selected: flatResults.findIndex(f => f.id === result.id && f.type === result.type) === selectedIndex }"
            @click="selectResult(result)"
            @mouseenter="selectedIndex = flatResults.findIndex(f => f.id === result.id && f.type === result.type)"
            @touchstart.passive="handleTouchStart(flatResults.findIndex(f => f.id === result.id && f.type === result.type))"
          >
            <div class="result-main-row">
              <span class="result-id">{{ result.id }}</span>
              <span class="result-title" v-html="highlightText(result.title, debouncedQuery)" />
            </div>
            <span v-if="result.snippet" class="result-snippet" v-html="highlightText(result.snippet, debouncedQuery)" />
          </div>
        </div>
      </template>

      <!-- 无结果 -->
      <div v-if="totalResults === 0" class="no-results">
        {{ t("search.noResults") }}
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="search-footer" v-if="!debouncedQuery.trim()">
      <span class="footer-hint">{{ t("search.hint") }}</span>
    </div>
  </el-dialog>
</template>

<style scoped>
.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.search-input {
  flex: 1;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: none;
  border: 1px solid var(--el-border-color);
}

.shortcut-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
  padding: 4px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-light);
}

.search-results {
  max-height: min(60vh, 420px);
  overflow-y: auto;
  padding: 0 4px;
}

.result-group {
  margin-bottom: 12px;
}

.result-group-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.result-count {
  font-size: 11px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  padding: 1px 6px;
  border-radius: 8px;
}

.search-result-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.search-result-item:hover,
.search-result-item:active,
.search-result-item.selected {
  background-color: var(--el-fill-color-light);
}

.result-main-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
  flex: 0 0 auto;
}

.result-title {
  font-size: 14px;
  color: var(--el-text-color-primary);
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-snippet {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding-left: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-results {
  text-align: center;
  padding: 32px 0;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}

.search-footer {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.footer-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

:deep(.search-highlight) {
  background-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  padding: 0 2px;
  border-radius: 2px;
}

@media (max-width: 767px) {
  .result-snippet {
    padding-left: 0;
  }
}
</style>

<style>
/* 非 scoped 样式，调整 Dialog 本体 */
.search-dialog .el-dialog__header {
  display: none;
}

.search-dialog .el-dialog__body {
  padding: 16px 20px;
}

.search-dialog .el-dialog {
  border-radius: 12px;
}
</style>
