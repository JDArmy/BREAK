<script setup lang="ts">
import { type ComponentPublicInstance } from "vue";

const props = defineProps<{
  sankeyData: { nodes: unknown[]; links: unknown[] };
  chartMinWidth?: number;
  setSankeyChartElement?: (element: HTMLDivElement | undefined) => void;
}>();

const setRef = (el: Element | ComponentPublicInstance | null) => {
  props.setSankeyChartElement?.((el as HTMLDivElement) || undefined);
};
</script>

<template>
  <div class="sankey-pane">
    <div v-if="sankeyData.nodes.length === 0" class="sankey-empty">
      {{ $t("relationView.noAttackPath") }}
    </div>
    <div
      v-show="sankeyData.nodes.length > 0"
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
    min-height: 0;
    overflow-x: auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .sankey-chart {
    min-height: 100%;
  }

  .sankey-empty {
    min-height: 240px;
  }
}
</style>
