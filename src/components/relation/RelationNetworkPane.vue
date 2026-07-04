<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { inject } from "vue";
import { useI18n } from "vue-i18n";
import RelationFilterPanels from "@/components/relation/RelationFilterPanels.vue";
import RelationGraphToolbar from "@/components/relation/RelationGraphToolbar.vue";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

// inject viewModel（RelationView provide），取代 props 钻取
const vm = inject(RELATION_VIEW_MODEL_KEY)!;
// ref/computed 解构安全，模板内自动 unwrap；方法直接解构
const {
  setNetworkPaneElement,
  setNetworkScrollerElement,
  setNetworkChartElement,
  networkLayoutTooltip,
  networkLayoutOptions,
  networkState,
  nodeFilterVisible,
  lineFilterVisible,
  filterRelationType,
  filterSubNode,
  filterRelatedEntity,
  filterLineType,
  relationTypeItems,
  subNodeFilterColor,
  visibleRelationLegendItems,
  formatRelationFieldsTooltip,
  selectedNetworkRelationDetail: selectedRelationDetail,
  enterFullscreen,
  zoomNetworkChart,
  handleNetworkLayoutCommand,
  refreshNetworkChart,
  downloadNetworkChart,
  toggleNodeFilter,
  toggleLineFilter,
  openNodeDetailDrawer,
  doFilter,
  closeNetworkRelationDetail,
} = vm;

const { t } = useI18n();

const setNetworkPaneRef = (el: Element | ComponentPublicInstance | null) => {
  setNetworkPaneElement?.((el as HTMLDivElement) || undefined);
};

const setNetworkChartRef = (el: Element | ComponentPublicInstance | null) => {
  setNetworkChartElement?.((el as HTMLDivElement) || undefined);
};

const setNetworkScrollerRef = (
  el: Element | ComponentPublicInstance | null
) => {
  setNetworkScrollerElement?.((el as HTMLDivElement) || undefined);
};
</script>

<template>
  <div :ref="setNetworkPaneRef" class="network-graph-pane">
    <RelationGraphToolbar
      :network-layout-tooltip="networkLayoutTooltip"
      :network-layout-options="networkLayoutOptions"
      :network-state="networkState"
      :node-filter-visible="nodeFilterVisible"
      :line-filter-visible="lineFilterVisible"
      @fullscreen="enterFullscreen"
      @zoom-in="zoomNetworkChart(0.08)"
      @zoom-out="zoomNetworkChart(-0.08)"
      @layout-command="handleNetworkLayoutCommand"
      @refresh="refreshNetworkChart"
      @download="downloadNetworkChart"
      @toggle-node-filter="toggleNodeFilter"
      @toggle-line-filter="toggleLineFilter"
      @open-node-detail="openNodeDetailDrawer"
    />

    <div :ref="setNetworkScrollerRef" class="network-canvas-scroll">
      <div :ref="setNetworkChartRef" class="network-chart"></div>
    </div>

    <aside
      v-if="selectedRelationDetail"
      class="network-relation-detail"
      :aria-label="t('relationView.edgeDetail')"
    >
      <div class="network-relation-detail-header">
        <div>
          <div class="network-relation-detail-title">
            {{ selectedRelationDetail.text }}
          </div>
          <div class="network-relation-detail-path">
            <span class="network-relation-node-chip">
              {{ selectedRelationDetail.sourceDisplay }}
            </span>
            <span class="network-relation-arrow">→</span>
            <span class="network-relation-node-chip">
              {{ selectedRelationDetail.targetDisplay }}
            </span>
          </div>
        </div>
        <button
          type="button"
          class="network-relation-detail-close"
          :aria-label="t('relationView.closeEdgeDetail')"
          @click="closeNetworkRelationDetail"
        >
          ×
        </button>
      </div>
      <div class="network-relation-detail-body">
        <div class="network-relation-evidence">
          {{ t("relationView.evidence") }}:
          {{ selectedRelationDetail.evidenceLabel }}
        </div>
        <p>
          {{
            selectedRelationDetail.explanation.semanticExplanation ||
            selectedRelationDetail.explanation.explanation
          }}
        </p>
        <p>{{ selectedRelationDetail.explanation.impactHint }}</p>
        <div
          v-if="selectedRelationDetail.sourceFields.length"
          class="network-relation-detail-muted"
        >
          {{ t("relationView.sourceFields") }}:
          {{ selectedRelationDetail.sourceFields.join(", ") }}
        </div>
        <div
          v-if="selectedRelationDetail.explanation.qualityFlags.length"
          class="network-relation-detail-muted"
        >
          {{ selectedRelationDetail.explanation.qualityFlags.join(", ") }}
        </div>
      </div>
    </aside>

    <RelationFilterPanels
      :node-filter-visible="nodeFilterVisible"
      :line-filter-visible="lineFilterVisible"
      :filter-relation-type="filterRelationType"
      :filter-sub-node="filterSubNode"
      :filter-related-entity="filterRelatedEntity"
      :filter-line-type="filterLineType"
      :relation-type-items="relationTypeItems"
      :sub-node-filter-color="subNodeFilterColor"
      :visible-relation-legend-items="visibleRelationLegendItems"
      :format-relation-fields-tooltip="formatRelationFieldsTooltip"
      @update:node-filter-visible="nodeFilterVisible = $event"
      @update:line-filter-visible="lineFilterVisible = $event"
      @update:filter-relation-type="filterRelationType = $event"
      @update:filter-sub-node="filterSubNode = $event"
      @update:filter-related-entity="filterRelatedEntity = $event"
      @update:filter-line-type="filterLineType = $event"
      @filter="doFilter"
    />
  </div>
</template>

<style scoped>
.network-graph-pane {
  box-sizing: border-box;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
  border: var(--break-graph-border) solid 1px;
  background: var(--break-bg-card);
}

.network-chart {
  width: 100%;
  height: 100%;
}

.network-canvas-scroll {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.network-relation-detail {
  position: absolute;
  z-index: 720;
  right: 74px;
  bottom: 16px;
  box-sizing: border-box;
  width: min(420px, calc(100% - 112px));
  max-height: min(46vh, 360px);
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-card);
  color: var(--break-text-primary);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
}

.network-relation-detail-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.network-relation-detail-title {
  color: var(--break-text-primary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.network-relation-detail-path {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  color: var(--break-text-muted);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.network-relation-node-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 7px;
  border: 1px solid color-mix(in srgb, var(--break-border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--break-bg-soft) 72%, transparent);
  color: var(--break-text-secondary);
  font-weight: 700;
}

.network-relation-arrow {
  color: var(--break-text-muted);
}

.network-relation-detail-close {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--break-text-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.network-relation-detail-close:hover {
  background: var(--break-bg-soft);
  color: var(--break-text-primary);
}

.network-relation-detail-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
}

.network-relation-detail-body p {
  margin: 0;
}

.network-relation-evidence {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary) 14%, transparent);
  color: var(--break-text-secondary);
  font-weight: 700;
}

.network-relation-detail-muted {
  padding-top: 7px;
  border-top: 1px solid var(--break-border);
  color: var(--break-text-muted);
  overflow-wrap: anywhere;
}

.network-graph-pane:fullscreen {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
}

@media (max-width: 767px) {
  .network-graph-pane {
    overflow: hidden;
    min-height: 0;
  }

  .network-graph-pane--app-fullscreen {
    position: fixed;
    z-index: 5000;
    inset: 0;
    width: 100dvw;
    height: 100dvh;
    min-height: 100dvh;
    border: 0;
  }

  /* 面板限高一屏（由 RelationView 的 relation-page--mobile-network 控制），
     画布在面板内可平移滚动，节点保持分散的大画布布局，避免挤成一坨。 */
  .network-canvas-scroll {
    width: 100%;
    height: 100%;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .network-chart {
    width: max(1180px, 260vw);
    height: max(940px, 160vh);
    -webkit-touch-callout: none;
    user-select: none;
  }

  .network-relation-detail {
    right: 8px;
    bottom: 58px;
    left: 8px;
    width: auto;
    max-height: 42vh;
    padding: 10px;
  }
}
</style>
