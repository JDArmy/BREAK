<script setup lang="ts">
import { type ComponentPublicInstance } from "vue";

const props = defineProps<{
  active: boolean;
  hasData: boolean;
  chartMinWidth?: number;
  setSankeyChartElement?: (element: HTMLDivElement | undefined) => void;
}>();

const setRef = (el: Element | ComponentPublicInstance | null) => {
  props.setSankeyChartElement?.((el as HTMLDivElement) || undefined);
};

</script>

<template>
  <div class="sankey-pane">
    <div v-if="active && !hasData" class="sankey-empty">
      {{ $t("relationView.noAttackPath") }}
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

  .sankey-empty {
    min-height: 240px;
  }

}
</style>
