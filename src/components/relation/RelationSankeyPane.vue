<script setup lang="ts">
import { computed, type ComponentPublicInstance } from "vue";
import { useI18n } from "vue-i18n";
import {
  RelationType,
  type AttackPathDetail,
  type AttackPathFilterOption,
  type AttackPathFilters,
  type AttackPathFilterType,
  type createRelationTypeMapping,
  type RiskAvoidanceCoverage,
} from "@/views/relation/relationTypes";

const props = defineProps<{
  active: boolean;
  hasData: boolean;
  chartMinWidth?: number;
  relationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  attackPathDetails: AttackPathDetail[];
  attackPathFilterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]>;
  attackPathFilters: AttackPathFilters;
  filteredAttackPathCount: number;
  hasActiveAttackPathFilters: boolean;
  riskAvoidanceCoverage: RiskAvoidanceCoverage | null;
  selectedAttackPathDetail: AttackPathDetail | null;
  selectedAttackPathId: string;
  setSankeyChartElement?: (element: HTMLDivElement | undefined) => void;
}>();

const emit = defineEmits<{
  "update:attackPathFilters": [value: AttackPathFilters];
  "selectAttackPath": [value: string];
  "resetAttackPathFilters": [];
}>();

const { t } = useI18n();

const setRef = (el: Element | ComponentPublicInstance | null) => {
  props.setSankeyChartElement?.((el as HTMLDivElement) || undefined);
};

const filterTypes: AttackPathFilterType[] = [
  RelationType.threatActor,
  RelationType.attackTool,
  RelationType.risk,
  RelationType.avoidance,
];

const updateFilter = (type: AttackPathFilterType, value: string | undefined) => {
  emit("update:attackPathFilters", {
    ...props.attackPathFilters,
    [type]: value || undefined,
  });
};

const pathOptions = computed(() =>
  props.attackPathDetails.slice(0, 200).map((detail) => ({
    label: detail.label,
    value: detail.id,
  }))
);

const applyAvoidanceCoverageFilter = (avoidanceKey: string) => {
  updateFilter(RelationType.avoidance, avoidanceKey);
};
</script>

<template>
  <div class="sankey-pane">
    <div v-if="active" class="sankey-toolbar">
      <div class="sankey-filter-grid">
        <label
          v-for="type in filterTypes"
          :key="type"
          class="sankey-filter"
        >
          <span>{{ relationTypeMapping[type].title }}</span>
          <el-select
            :model-value="attackPathFilters[type]"
            clearable
            filterable
            :placeholder="t('relationView.pathFilterPlaceholder')"
            @update:model-value="updateFilter(type, $event as string | undefined)"
          >
            <el-option
              v-for="option in attackPathFilterOptions[type]"
              :key="option.key"
              :label="`${option.label} (${option.count})`"
              :value="option.key"
            />
          </el-select>
        </label>
      </div>
      <div class="sankey-toolbar-summary">
        <span>{{ t("relationView.filteredPathCount", { count: filteredAttackPathCount }) }}</span>
        <el-button
          v-if="hasActiveAttackPathFilters"
          size="small"
          text
          @click="emit('resetAttackPathFilters')"
        >
          {{ t("relationView.resetPathFilters") }}
        </el-button>
      </div>
    </div>

    <div v-if="active && !hasData" class="sankey-empty">
      {{ $t("relationView.noAttackPath") }}
    </div>

    <div v-if="active && riskAvoidanceCoverage" class="sankey-coverage">
      <div class="sankey-coverage-header">
        <div>
          <h3>{{ t("relationView.coverageMode") }}</h3>
          <p>
            {{ t("relationView.coverageModeSummary", {
              total: riskAvoidanceCoverage.totalCount,
              direct: riskAvoidanceCoverage.directCount,
              tool: riskAvoidanceCoverage.attackToolCount,
              overlap: riskAvoidanceCoverage.overlapCount,
            }) }}
          </p>
        </div>
      </div>
      <div class="sankey-coverage-list">
        <button
          v-for="item in riskAvoidanceCoverage.items"
          :key="item.avoidanceKey"
          type="button"
          :class="[
            'sankey-coverage-item',
            `sankey-coverage-item-${item.source}`,
            attackPathFilters[RelationType.avoidance] === item.avoidanceKey ? 'sankey-coverage-item-active' : '',
          ]"
          @click="applyAvoidanceCoverageFilter(item.avoidanceKey)"
        >
          <span class="sankey-coverage-main">
            <strong>{{ item.avoidanceKey }}</strong>
            <span>{{ item.avoidanceTitle }}</span>
          </span>
          <span class="sankey-coverage-meta">
            <span>{{ item.sourceLabel }}</span>
            <span>{{ t("relationView.coveragePathCount", { count: item.pathCount }) }}</span>
          </span>
          <span v-if="item.attackToolLabels.length" class="sankey-coverage-tools">
            {{ t("relationView.coverageToolSources") }}: {{ item.attackToolLabels.join(", ") }}
          </span>
          <span class="sankey-coverage-fields">
            {{ t("relationView.sourceFields") }}: {{ item.sourceFields.join(", ") }}
          </span>
        </button>
      </div>
    </div>

    <div v-if="active && selectedAttackPathDetail" class="sankey-detail">
      <div class="sankey-detail-header">
        <div>
          <h3>{{ t("relationView.pathDetail") }}</h3>
          <p>{{ t("relationView.pathDetailSummary") }}</p>
        </div>
        <el-select-v2
          v-if="pathOptions.length > 1"
          class="sankey-path-select"
          filterable
          :height="280"
          :item-height="34"
          :model-value="selectedAttackPathId"
          :options="pathOptions"
          @update:model-value="emit('selectAttackPath', String($event))"
        />
      </div>

      <div class="sankey-path-chain">
        <span
          v-for="(node, index) in selectedAttackPathDetail.nodes"
          :key="`${node.type}:${node.key}`"
          class="sankey-path-node"
        >
          <span>{{ node.label }}</span>
          <span v-if="index < selectedAttackPathDetail.nodes.length - 1" class="sankey-path-arrow">-></span>
        </span>
      </div>

      <div class="sankey-segments">
        <div
          v-for="segment in selectedAttackPathDetail.segments"
          :key="`${segment.source.type}:${segment.source.key}->${segment.target.type}:${segment.target.key}`"
          class="sankey-segment"
        >
          <div class="sankey-segment-main">
            <strong>{{ segment.source.key }}</strong>
            <span>{{ segment.relation }}</span>
            <strong>{{ segment.target.key }}</strong>
          </div>
          <div class="sankey-segment-reason">{{ segment.reason }}</div>
          <div class="sankey-segment-fields">
            {{ t("relationView.sourceFields") }}: {{ segment.sourceFields.join(", ") }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-show="active"
      :ref="setRef"
      class="sankey-chart"
      :style="{ minWidth: chartMinWidth ? `${chartMinWidth}px` : undefined }"
    ></div>
  </div>
</template>

<style scoped>
.sankey-pane {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  overflow-x: hidden;
  overflow-y: auto;
  border: var(--break-graph-border) solid 1px;
  background: var(--break-bg-card);
}

.sankey-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--break-border);
  background: var(--break-bg-card);
}

.sankey-filter-grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(4, minmax(132px, 1fr));
  gap: 8px;
}

.sankey-filter {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  color: var(--break-text-secondary);
  font-size: 12px;
}

.sankey-filter :deep(.el-select) {
  width: 100%;
}

.sankey-toolbar-summary {
  display: flex;
  min-width: 126px;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--break-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.sankey-chart {
  width: 100%;
  min-height: 100%;
}

.sankey-empty {
  display: flex;
  height: 100%;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  color: var(--break-graph-text);
  font-size: 14px;
}

.sankey-coverage {
  margin: 0 12px 12px;
  padding: 12px;
  border: 1px solid var(--break-border);
  background: var(--break-bg-secondary);
}

.sankey-coverage-header h3 {
  margin: 0 0 4px;
  color: var(--break-text-primary);
  font-size: 14px;
}

.sankey-coverage-header p {
  margin: 0;
  color: var(--break-text-secondary);
  font-size: 12px;
}

.sankey-coverage-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.sankey-coverage-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  padding: 9px;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
  color: var(--break-text-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.sankey-coverage-item:hover,
.sankey-coverage-item-active {
  border-color: var(--el-color-primary);
}

.sankey-coverage-item-both {
  border-left: 3px solid var(--el-color-success);
}

.sankey-coverage-item-risk {
  border-left: 3px solid var(--el-color-primary);
}

.sankey-coverage-item-attackTool {
  border-left: 3px solid var(--el-color-warning);
}

.sankey-coverage-main,
.sankey-coverage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 8px;
  align-items: center;
}

.sankey-coverage-main {
  color: var(--break-text-primary);
  font-size: 13px;
}

.sankey-coverage-meta,
.sankey-coverage-tools,
.sankey-coverage-fields {
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.sankey-detail {
  margin: 0 12px 12px;
  padding: 12px;
  border: 1px solid var(--break-border);
  background: var(--break-bg-secondary);
}

.sankey-detail-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.sankey-detail h3 {
  margin: 0 0 4px;
  color: var(--break-text-primary);
  font-size: 14px;
}

.sankey-detail p {
  margin: 0;
  color: var(--break-text-secondary);
  font-size: 12px;
}

.sankey-path-select {
  width: min(520px, 48%);
}

.sankey-path-chain {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  color: var(--break-text-primary);
  font-size: 12px;
}

.sankey-path-node {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.sankey-path-arrow {
  color: var(--break-text-muted);
}

.sankey-segments {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.sankey-segment {
  padding: 8px;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
}

.sankey-segment-main {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  color: var(--break-text-primary);
  font-size: 13px;
}

.sankey-segment-reason,
.sankey-segment-fields {
  margin-top: 4px;
  color: var(--break-text-secondary);
  font-size: 12px;
}

@media (max-width: 767px) {
  .sankey-pane {
    height: auto;
    min-height: 0;
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
  }

  .sankey-chart {
    min-height: 100%;
    -webkit-touch-callout: none;
    user-select: none;
  }

  .sankey-toolbar {
    position: static;
    flex-direction: column;
    align-items: stretch;
    padding: 8px;
  }

  .sankey-filter-grid {
    grid-template-columns: 1fr;
  }

  .sankey-toolbar-summary {
    align-items: flex-start;
  }

  .sankey-empty {
    min-height: 240px;
  }

  .sankey-detail {
    margin: 0 8px 8px;
    padding: 10px;
  }

  .sankey-coverage {
    margin: 0 8px 8px;
    padding: 10px;
  }

  .sankey-coverage-list {
    grid-template-columns: 1fr;
  }

  .sankey-detail-header {
    flex-direction: column;
  }

  .sankey-path-select {
    width: 100%;
  }
}
</style>
