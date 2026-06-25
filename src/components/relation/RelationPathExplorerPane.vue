<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import {
  RelationType,
  type SankeyNode,
  type SankeyLink,
  type createRelationTypeMapping,
} from "@/views/relation/relationTypes";
import type { PathExplorerStats } from "@/views/relation/relationPathExplorerSankey";

const props = defineProps<{
  active: boolean;
  relType: RelationType;
  relKey: string;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  pathExplorerSankeyData: { nodes: SankeyNode[]; links: SankeyLink[] };
  pathExplorerHasData: boolean;
  pathExplorerChartHeight: number;
  pathExplorerStats: PathExplorerStats | null;
  hasTarget: boolean;
  searching: boolean;
  setPathExplorerChartElement?: (el: HTMLElement | undefined) => void;
}>();

const emit = defineEmits<{
  "update:startType": [value: RelationType];
  "update:startKey": [value: string];
  "update:endType": [value: RelationType];
  "update:endKey": [value: string];
  "update:maxDepth": [value: number];
  "update:maxPaths": [value: number];
}>();

const { t } = useI18n();

// 可选择的实体类型（排除 term 和 all）
const selectableTypes = computed(() =>
  [RelationType.risk, RelationType.avoidance, RelationType.attackTool, RelationType.threatActor]
    .map((type) => ({
      value: type,
      label: props.RelationTypeMapping[type].title,
    }))
);

// 本地状态（双绑到父组件）
const startType = ref<RelationType>(props.relType);
const startKey = ref(props.relKey);
const endType = ref<RelationType>(RelationType.avoidance);
const endKey = ref("");
const maxDepth = ref(4);
const maxPaths = ref(10);

// 初始化时同步父组件
watch(() => props.relType, (val) => { startType.value = val; }, { immediate: true });
watch(() => props.relKey, (val) => { startKey.value = val; }, { immediate: true });

// 同步到父组件
watch(startType, (val) => emit("update:startType", val));
watch(startKey, (val) => emit("update:startKey", val));
watch(endType, (val) => emit("update:endType", val));
watch(endKey, (val) => emit("update:endKey", val));
watch(maxDepth, (val) => emit("update:maxDepth", val));
watch(maxPaths, (val) => emit("update:maxPaths", val));

// 实体选项构建（虚拟化列表，懒加载）
const getBreakKey = (type: RelationType) =>
  props.RelationTypeMapping[type as keyof typeof props.RelationTypeMapping]?.BreakKey as keyof typeof BREAK | undefined;

const startEntityOptions = ref<{ value: string; label: string }[]>([]);
const endEntityOptions = ref<{ value: string; label: string }[]>([]);

let startBuildTimer: ReturnType<typeof setTimeout> | null = null;
let endBuildTimer: ReturnType<typeof setTimeout> | null = null;

const buildOptions = (type: RelationType) => {
  const breakKey = getBreakKey(type);
  if (!breakKey) return [];
  const entities = BREAK[breakKey] as Record<string, { title?: string }>;
  return Object.keys(entities).map((key) => ({
    value: key,
    label: `${key}: ${t(`BREAK.${breakKey}.${key}.title`)}`,
  }));
};

const rebuildStartOptions = () => {
  startEntityOptions.value = buildOptions(startType.value);
};

const rebuildEndOptions = () => {
  endEntityOptions.value = buildOptions(endType.value);
};

watch(startType, () => {
  startKey.value = "";
  if (startBuildTimer) clearTimeout(startBuildTimer);
  startBuildTimer = setTimeout(rebuildStartOptions, 50);
});

watch(endType, () => {
  endKey.value = "";
  if (endBuildTimer) clearTimeout(endBuildTimer);
  endBuildTimer = setTimeout(rebuildEndOptions, 50);
});

onMounted(() => {
  rebuildStartOptions();
  rebuildEndOptions();
});

onUnmounted(() => {
  if (startBuildTimer) clearTimeout(startBuildTimer);
  if (endBuildTimer) clearTimeout(endBuildTimer);
});

// 桑基图容器引用
const chartRef = ref<HTMLElement>();
const setRef = (el: unknown) => {
  const element = el instanceof HTMLElement ? el : undefined;
  chartRef.value = element;
  props.setPathExplorerChartElement?.(element);
};
</script>

<template>
  <div v-show="active" class="path-explorer-pane">
    <!-- 控制面板 -->
    <div class="path-explorer-controls">
      <div class="control-row">
        <!-- 起点选择 -->
        <div class="control-group">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.sourceType") }}</label>
          <el-select v-model="startType" size="small" class="type-select">
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
            v-model="startKey"
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
        <div class="control-group">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.targetType") }}</label>
          <el-select v-model="endType" size="small" class="type-select">
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
            v-model="endKey"
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
          <label class="control-label">{{ t("relationView.pathExplorerPanel.maxHops") }}: {{ maxDepth }}</label>
          <el-slider v-model="maxDepth" :min="1" :max="6" :step="1" size="small" class="param-slider" />
        </div>
        <div class="control-group control-group--slider">
          <label class="control-label">{{ t("relationView.pathExplorerPanel.maxPaths") }}: {{ maxPaths }}</label>
          <el-slider v-model="maxPaths" :min="1" :max="30" :step="1" size="small" class="param-slider" />
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
          :style="{ height: pathExplorerChartHeight + 'px' }"
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
  overflow-x: hidden;
  overflow-y: auto;
  /* header(60) + tabs(46) + 控制面板(~130) + margin/padding(~44) = ~280px */
  max-height: calc(100vh - 280px);
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
}

@media (max-width: 767px) {
  .control-row {
    flex-direction: column;
    align-items: stretch;
  }

  .control-separator {
    text-align: center;
    align-self: center;
    margin: 4px 0;
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
