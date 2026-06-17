<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { useI18n } from "vue-i18n";
import RelationFilterPanels from "@/components/relation/RelationFilterPanels.vue";
import RelationGraphToolbar from "@/components/relation/RelationGraphToolbar.vue";
import type {
  GraphLink,
  NetworkLayoutMode,
} from "@/views/relation/relationTypes";

const props = defineProps<{
  setNetworkPaneElement?: (element: HTMLDivElement | undefined) => void;
  setNetworkScrollerElement?: (element: HTMLDivElement | undefined) => void;
  setNetworkChartElement?: (element: HTMLDivElement | undefined) => void;
  networkLayoutTooltip: string;
  networkLayoutOptions: { value: NetworkLayoutMode; labelKey: string }[];
  networkState: { layout: NetworkLayoutMode };
  nodeFilterVisible: boolean;
  lineFilterVisible: boolean;
  filterRelationType: string[];
  filterSubNode: boolean;
  filterLineType: string[];
  relationTypeItems: { key: string; title: string; color: string }[];
  subNodeFilterColor?: string;
  visibleRelationLegendItems: {
    color: string;
    label: string;
    fields: string[];
  }[];
  formatRelationFieldsTooltip: (fields: string[]) => string;
  selectedRelationDetail?: GraphLink | null;
}>();

const emit = defineEmits<{
  fullscreen: [];
  zoomIn: [];
  zoomOut: [];
  layoutCommand: [command: string | number | object];
  refresh: [];
  download: [];
  toggleNodeFilter: [];
  toggleLineFilter: [];
  openNodeDetail: [];
  "update:nodeFilterVisible": [value: boolean];
  "update:lineFilterVisible": [value: boolean];
  "update:filterRelationType": [value: string[]];
  "update:filterSubNode": [value: boolean];
  "update:filterLineType": [value: string[]];
  filter: [];
  closeRelationDetail: [];
}>();

const { t } = useI18n();

const setNetworkPaneRef = (el: Element | ComponentPublicInstance | null) => {
  props.setNetworkPaneElement?.((el as HTMLDivElement) || undefined);
};

const setNetworkChartRef = (el: Element | ComponentPublicInstance | null) => {
  props.setNetworkChartElement?.((el as HTMLDivElement) || undefined);
};

const setNetworkScrollerRef = (
  el: Element | ComponentPublicInstance | null
) => {
  props.setNetworkScrollerElement?.((el as HTMLDivElement) || undefined);
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
      @fullscreen="emit('fullscreen')"
      @zoom-in="emit('zoomIn')"
      @zoom-out="emit('zoomOut')"
      @layout-command="emit('layoutCommand', $event)"
      @refresh="emit('refresh')"
      @download="emit('download')"
      @toggle-node-filter="emit('toggleNodeFilter')"
      @toggle-line-filter="emit('toggleLineFilter')"
      @open-node-detail="emit('openNodeDetail')"
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
          @click="emit('closeRelationDetail')"
        >
          ×
        </button>
      </div>
      <div class="network-relation-detail-body">
        <div class="network-relation-evidence">
          {{ t("relationView.evidence") }}:
          {{ selectedRelationDetail.evidenceLabel }}
        </div>
        <p>{{ selectedRelationDetail.explanation.explanation }}</p>
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
      :filter-line-type="filterLineType"
      :relation-type-items="relationTypeItems"
      :sub-node-filter-color="subNodeFilterColor"
      :visible-relation-legend-items="visibleRelationLegendItems"
      :format-relation-fields-tooltip="formatRelationFieldsTooltip"
      @update:node-filter-visible="emit('update:nodeFilterVisible', $event)"
      @update:line-filter-visible="emit('update:lineFilterVisible', $event)"
      @update:filter-relation-type="emit('update:filterRelationType', $event)"
      @update:filter-sub-node="emit('update:filterSubNode', $event)"
      @update:filter-line-type="emit('update:filterLineType', $event)"
      @filter="emit('filter')"
    />
  </div>
</template>

<style scoped>
.network-graph-pane {
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

  .network-canvas-scroll {
    height: 100%;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .network-chart {
    width: max(1180px, 260vw);
    height: max(940px, 190vh);
    min-height: 940px;
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
