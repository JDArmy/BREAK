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
  }

  .sankey-empty {
    min-height: 240px;
  }
}
</style>
