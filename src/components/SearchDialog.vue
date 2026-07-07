<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Search } from "@element-plus/icons-vue";
import { useSearch, type EntityType, type SearchResult } from "@/composables/useSearch";
import { useCases } from "@/composables/useCases";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { inferEntityType, ALL_ENTITY_TYPES, entityRegistry, getEntityEntry } from "@/BREAK/entityRegistry";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const router = useRouter();
const { t } = useI18n();
const { search: doSearch } = useSearch();
const { ensureCases } = useCases();
const { isMobile } = useBreakpoints();

const query = ref("");
const selectedIndex = ref(-1);
const inputRef = ref<InstanceType<typeof import("element-plus")["ElInput"]> | null>(null);

const emptyResults = () =>
  ({ risk: [], avoidance: [], attackTool: [], threatActor: [], term: [], case: [] }) as Record<
    EntityType,
    SearchResult[]
  >;

// 默认分组显示顺序（从 entityRegistry 派生）
const DEFAULT_TYPE_ORDER: EntityType[] = [...ALL_ENTITY_TYPES];

// 根据搜索词自动调整分组顺序：搜索实体 ID 时将对应类型提前到首位
const sortedTypes = computed(() => {
  const q = debouncedQuery.value.trim();
  if (!q) return DEFAULT_TYPE_ORDER;
  // BS 前缀无独立类型，保持默认 risk
  const matchedType = q.match(/^BS\d/i) ? ("risk" as EntityType) : inferEntityType(q);
  if (matchedType) {
    return [matchedType, ...DEFAULT_TYPE_ORDER.filter(t => t !== matchedType)];
  }
  return DEFAULT_TYPE_ORDER;
});

// 扁平化的所有结果（用于键盘导航索引，顺序跟随 sortedTypes）
const flatResults = computed(() => {
  const flat: (SearchResult & { groupIndex: number })[] = [];
  let groupIdx = 0;
  for (const type of sortedTypes.value) {
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
  term: "search.groupTerm",
  case: "search.groupCase",
};

// 各类型对应的详情路由（从 entityRegistry 派生）
const getHomeDetailRoute = (type: EntityType) => {
  const e = getEntityEntry(type);
  return { name: e.homeDetailRouteName, paramKey: e.paramKey };
};
const getBusinessSceneDetailRoute = (type: EntityType) => {
  const e = getEntityEntry(type);
  return {
    name: e.businessSceneDetailRouteName || e.homeDetailRouteName,
    paramKey: e.paramKey,
    keepsBusinessScene: Boolean(e.businessSceneDetailRouteName),
  };
};

// 搜索命中字段 → 显示标签（不用 i18n 因为字段名是内部标识，用简短中英混合标签更直观）
const fieldLabels: Record<string, string> = {
  title: "search.fieldTitle",
  keywords: "search.fieldKeywords",
  aliases: "search.fieldAliases",
  category: "search.fieldCategory",
  definition: "search.fieldDefinition",
  description: "search.fieldDescription",
  influence: "search.fieldInfluence",
  limitation: "search.fieldLimitation",
  usageExample: "search.fieldUsageExample",
  summary: "search.fieldSummary",
  referenceTitles: "search.fieldReferences",
};

// 首页相关路由名（从 entityRegistry 派生），搜索结果应在首页抽屉中打开
const homePageRoutes = new Set([
  "home",
  ...entityRegistry.map(e => e.homeDetailRouteName).filter(Boolean),
]);

// 业务场景相关路由名（从 entityRegistry 派生），搜索结果应在业务场景抽屉中打开
const businessSceneRoutes = new Set([
  "businessScene",
  ...entityRegistry.map(e => e.businessSceneDetailRouteName).filter(Boolean),
]);

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
  // text 来自外部 JSON 数据（含 case），必须先 HTML 转义，防止 <img onerror=...> 等注入执行
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  // queryStr 同样转义后参与匹配，避免转义字符（如 &）错配
  const escapedQuery = queryStr
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// 选择搜索结果
function selectResult(result: SearchResult) {
  emit("update:modelValue", false);

  const currentName = router.currentRoute.value.name as string;
  const isHomePage = homePageRoutes.has(currentName);
  const isBusinessScene = businessSceneRoutes.has(currentName);

  if (isHomePage) {
    // 首页：使用 homeXxxDetail 抽屉路由
    const detailRoute = getHomeDetailRoute(result.type);
    router.push({
      name: detailRoute.name,
      params: { [detailRoute.paramKey]: result.id },
    });
  } else if (isBusinessScene) {
    // 业务场景页：支持业务场景抽屉的实体保留 bsKey；case 等无业务场景抽屉的实体回首页抽屉
    const bsKey = router.currentRoute.value.params.bsKey;
    const detailRoute = getBusinessSceneDetailRoute(result.type);
    router.push({
      name: detailRoute.name,
      params: detailRoute.keepsBusinessScene
        ? { bsKey, [detailRoute.paramKey]: result.id }
        : { [detailRoute.paramKey]: result.id },
    });
  } else {
    // 非首页（知识库页等）：也回到首页抽屉，保持全站搜索结果打开方式一致
    const detailRoute = getHomeDetailRoute(result.type);
    router.push({
      name: detailRoute.name,
      params: { [detailRoute.paramKey]: result.id },
    });
  }

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
    Promise.resolve(ensureCases()).catch(() => {
      // 加载失败由 useCases.loadError 维护，搜索索引在加载成功后自动重建
    }); // 确保案例数据已加载，加载完成后搜索索引自动重建
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
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
        id="global-search"
        ref="inputRef"
        v-model="query"
        name="global-search"
        :placeholder="t('search.placeholder')"
        size="large"
        clearable
        :prefix-icon="Search"
        class="search-input"
        aria-label="Search knowledge base"
      />
      <span v-if="!isMobile" class="shortcut-hint">{{ shortcutHint }}</span>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="debouncedQuery.trim()">
      <template v-for="type in sortedTypes" :key="type">
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
            <div class="result-snippet-row" v-if="result.snippet">
              <span v-if="result.matchedField && fieldLabels[result.matchedField]" class="field-badge">{{ t(fieldLabels[result.matchedField]) }}</span>
              <span class="result-snippet" v-html="highlightText(result.snippet, debouncedQuery)" />
            </div>
          </div>
        </div>
      </template>

      <!-- 无结果 -->
      <div v-if="totalResults === 0" class="no-results">
        {{ t("search.noResults") }}
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="search-footer" v-if="!debouncedQuery.trim() && !isMobile">
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

.result-snippet-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 80px;
  overflow: hidden;
}

.field-badge {
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-weight: 500;
}

.result-snippet {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
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
  .result-snippet-row {
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
