<script setup lang="ts">
import { computed, nextTick, ref, watch, onMounted, inject } from "vue";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import {
  RelationType,
} from "@/views/relation/relationTypes";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

// inject viewModel（RelationView provide），取代 props 钻取
const vm = inject(RELATION_VIEW_MODEL_KEY)!;
// ref/computed 解构安全，模板内自动 unwrap；方法直接解构
const {
  pathExplorerHasData,
  pathExplorerChartHeight,
  sankeyChartMinWidth: pathExplorerChartMinWidth,
  pathExplorerStats,
  hasTarget,
  searching,
  pathExplorerStartType,
  pathExplorerStartKey,
  pathExplorerEndType,
  pathExplorerEndKey,
  pathExplorerMaxDepth,
  pathExplorerMaxPaths,
  pathExplorerSankeyController,
} = vm;
// RelationTypeMapping 是普通对象（非 ref），直接取
const RelationTypeMapping = vm.RelationTypeMapping;
// 原 RelationView 模板 :active="activeView === 'pathExplorer'"
const active = computed(() => vm.activeView.value === "pathExplorer");

const { t, locale } = useI18n();

// 可选择的实体类型（排除 term 和 all）
const selectableTypes = computed(() =>
  [RelationType.risk, RelationType.avoidance, RelationType.attackTool, RelationType.threatActor]
    .map((type) => ({
      value: type,
      label: RelationTypeMapping[type].title,
    }))
);

// 滑块草稿值（基于 vm 的 maxDepth/maxPaths 初始化，提交时写回 vm）
const draftMaxDepth = ref(pathExplorerMaxDepth.value);
const draftMaxPaths = ref(pathExplorerMaxPaths.value);

// vm 的 maxDepth/maxPaths 变化时同步草稿
watch([pathExplorerMaxDepth, pathExplorerMaxPaths], ([d, p]) => {
  draftMaxDepth.value = d;
  draftMaxPaths.value = p;
});

const commitMaxDepth = (value: number | number[]) => {
  const nextValue = Array.isArray(value) ? value[0] : value;
  draftMaxDepth.value = nextValue;
  if (nextValue === pathExplorerMaxDepth.value) return;
  pathExplorerMaxDepth.value = nextValue;
};

const commitMaxPaths = (value: number | number[]) => {
  const nextValue = Array.isArray(value) ? value[0] : value;
  draftMaxPaths.value = nextValue;
  if (nextValue === pathExplorerMaxPaths.value) return;
  pathExplorerMaxPaths.value = nextValue;
};

// 实体选项构建：用 computed 让 label 随语言切换自动更新
// （t() 内部依赖 locale，computed 会自动重算）
const getBreakKey = (type: RelationType) =>
  RelationTypeMapping[type as keyof typeof RelationTypeMapping]?.BreakKey as keyof typeof BREAK | undefined;

const buildOptions = (type: RelationType) => {
  const breakKey = getBreakKey(type);
  if (!breakKey) return [];
  const entities = BREAK[breakKey] as Record<string, { title?: string }>;
  return Object.keys(entities).map((key) => ({
    value: key,
    label: `${key}: ${t(`BREAK.${breakKey}.${key}.title`)}`,
  }));
};

const startEntityOptions = computed(() => buildOptions(pathExplorerStartType.value));
const endEntityOptions = computed(() => buildOptions(pathExplorerEndType.value));

// 切换起点类型时清空起点实体
watch(pathExplorerStartType, () => {
  pathExplorerStartKey.value = "";
});

// 标记：初始化阶段不清空 endKey（从 URL 恢复时保留已设定的值）
let isInitializing = true;

watch(pathExplorerEndType, () => {
  if (isInitializing) return;
  pathExplorerEndKey.value = "";
  // 切换终点类型后，默认选中列表第一个实体
  nextTick(() => {
    const options = endEntityOptions.value;
    if (options.length > 0) {
      pathExplorerEndKey.value = options[0].value;
    }
  });
});

// 语言切换时，若终点为空则补选当前类型第一个实体（与初次挂载行为一致）
watch(locale, () => {
  if (isInitializing) return;
  if (!pathExplorerEndKey.value) {
    const options = endEntityOptions.value;
    if (options.length > 0) {
      pathExplorerEndKey.value = options[0].value;
    }
  }
});

onMounted(() => {
  // 初次挂载：若终点未设定（非 URL 恢复），默认选当前类型第一个实体
  if (!pathExplorerEndKey.value) {
    const options = endEntityOptions.value;
    if (options.length > 0) {
      pathExplorerEndKey.value = options[0].value;
    }
  }
  // 初始化完成后，后续 endType 变更才清空 endKey
  isInitializing = false;
});

// 桑基图容器引用
const chartRef = ref<HTMLElement>();
const setRef = (el: unknown) => {
  const element = el instanceof HTMLElement ? el : undefined;
  chartRef.value = element;
  pathExplorerSankeyController?.setSankeyChartElement?.(element);
};
</script>

<template>
  <div v-show="active" class="path-explorer-pane">
    <!-- 控制面板 -->
    <div class="path-explorer-controls">
      <div class="control-row">
        <!-- 起点选择 -->
        <div class="control-group control-group--type">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.sourceType") }}</label>
          <el-select v-model="pathExplorerStartType" size="small" class="type-select">
            <el-option
              v-for="opt in selectableTypes"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
        <div class="control-group control-group--entity">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.sourceEntity") }}</label>
          <el-select-v2
            v-model="pathExplorerStartKey"
            :options="startEntityOptions"
            size="small"
            filterable
            :placeholder="t('relationView.pathExplorerPanel.selectPlaceholder')"
            class="entity-select"
            :height="280"
            :item-height="32"
          />
        </div>

        <!-- 分隔 -->
        <div class="control-separator">→</div>

        <!-- 终点选择 -->
        <div class="control-group control-group--type">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.targetType") }}</label>
          <el-select v-model="pathExplorerEndType" size="small" class="type-select">
            <el-option
              v-for="opt in selectableTypes"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
        <div class="control-group control-group--entity">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.targetEntity") }}</label>
          <el-select-v2
            v-model="pathExplorerEndKey"
            :options="endEntityOptions"
            size="small"
            filterable
            :placeholder="t('relationView.pathExplorerPanel.selectPlaceholder')"
            class="entity-select"
            :height="280"
            :item-height="32"
          />
        </div>
      </div>

      <div class="control-row control-row--params">
        <div class="control-group control-group--slider">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.maxHops") }}: {{ draftMaxDepth }}</label>
          <el-slider
            v-model="draftMaxDepth"
            :min="1"
            :max="6"
            :step="1"
            size="small"
            class="param-slider"
            @change="commitMaxDepth"
          />
        </div>
        <div class="control-group control-group--slider">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.maxPaths") }}: {{ draftMaxPaths }}</label>
          <el-slider
            v-model="draftMaxPaths"
            :min="1"
            :max="30"
            :step="1"
            size="small"
            class="param-slider"
            @change="commitMaxPaths"
          />
        </div>
      </div>
    </div>

    <!-- 结果区域 -->
    <div class="path-explorer-result" :class="{ 'path-explorer-result--has-chart': pathExplorerHasData }">
      <!-- 空状态提示（搜索中 / 未选终点 / 无路径） -->
      <div v-show="searching" class="path-explorer-empty">
        {{ t("relationView.pathExplorerPanel.searching") }}
      </div>
      <div v-show="!searching && !hasTarget" class="path-explorer-empty">
        {{ t("relationView.pathExplorerPanel.noTarget") }}
      </div>
      <div v-show="!searching && hasTarget && !pathExplorerHasData" class="path-explorer-empty">
        {{ t("relationView.pathExplorerPanel.noPath") }}
      </div>

      <!-- 桑基图区域（始终挂载，v-show 控制显隐，避免参数变化时 DOM 重建导致图表丢失） -->
      <div v-show="!searching && pathExplorerHasData" class="path-explorer-chart-area">
        <div v-if="pathExplorerStats" class="path-explorer-stats">
          <span class="stat-item">
            {{ t("relationView.pathExplorerPanel.resultSummary", { count: pathExplorerStats.pathCount }) }}
          </span>
          <span class="stat-item stat-item--secondary">
            {{ t("relationView.pathExplorerPanel.hopRange", { min: pathExplorerStats.minHops, max: pathExplorerStats.maxHops }) }}
          </span>
        </div>
        <div
          class="path-explorer-chart"
          :ref="setRef"
          :style="{
            height: pathExplorerChartHeight + 'px',
            minWidth: pathExplorerChartMinWidth
              ? `${pathExplorerChartMinWidth}px`
              : undefined,
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.path-explorer-pane {
  padding: 0;
}

.path-explorer-controls {
  padding: 12px 16px;
  background: var(--break-bg-soft);
  border: 1px solid var(--break-border);
  border-radius: 8px;
  margin-bottom: 12px;
}

.control-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.control-row--params {
  margin-top: 12px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-group--entity {
  flex: 1;
  min-width: 160px;
}

.control-group--type {
  flex: 0 0 120px;
}

.control-group--slider {
  min-width: 140px;
}

.control-label {
  font-size: 12px;
  color: var(--break-text-secondary);
  white-space: nowrap;
}

.control-separator {
  font-size: 20px;
  color: var(--break-text-weak);
  padding: 0 4px;
  align-self: flex-end;
  margin-bottom: 4px;
}

.type-select {
  width: 120px;
}

.entity-select {
  width: 100%;
}

.param-slider {
  width: 120px;
}

.path-explorer-result {
  min-height: 200px;
}

.path-explorer-result--has-chart {
  border: var(--break-graph-border) solid 1px;
  border-radius: 8px;
  background: var(--break-bg-card);
  overflow: hidden;
}

.path-explorer-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--break-text-weak);
  font-size: 14px;
}

.path-explorer-stats {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--break-bg-card);
  border-bottom: 1px solid var(--break-border);
}

.stat-item {
  font-size: 13px;
  color: var(--break-text-primary);
  font-weight: 500;
}

.stat-item--secondary {
  color: var(--break-text-secondary);
  font-weight: normal;
}

.path-explorer-chart {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}

@media (max-width: 767px) {
  .control-row {
    display: grid;
    grid-template-columns: minmax(88px, 96px) minmax(0, 1fr);
    gap: 8px 10px;
    align-items: end;
  }

  .control-separator {
    display: none;
  }

  .control-group--type {
    flex: none;
    min-width: 0;
  }

  .control-group--entity {
    min-width: 0;
  }

  .type-select {
    width: 100%;
  }

  .control-group--slider {
    width: 100%;
  }

  .param-slider {
    width: 100%;
  }

  .control-row--params {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .path-explorer-result--has-chart {
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
  }

  .path-explorer-chart {
    -webkit-touch-callout: none;
    user-select: none;
  }
}
</style>
