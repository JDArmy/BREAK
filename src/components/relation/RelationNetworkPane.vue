<script setup lang="ts">
import type { DropdownInstance } from "element-plus";
import type { ComponentPublicInstance } from "vue";
import RelationFilterPanels from "@/components/relation/RelationFilterPanels.vue";
import RelationGraphContextMenu from "@/components/relation/RelationGraphContextMenu.vue";
import RelationGraphToolbar from "@/components/relation/RelationGraphToolbar.vue";
import RelationGraphTouchActions from "@/components/relation/RelationGraphTouchActions.vue";
import { RelationType, type NetworkLayoutMode } from "@/views/relation/relationTypes";

const props = defineProps<{
  setNetworkPaneElement?: (element: HTMLDivElement | undefined) => void;
  setNetworkChartElement?: (element: HTMLDivElement | undefined) => void;
  setDropdownInstance?: (instance: DropdownInstance | undefined) => void;
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
  visibleRelationLegendItems: { color: string; label: string; fields: string[] }[];
  formatRelationFieldsTooltip: (fields: string[]) => string;
  dropdownStyle: Record<string, string | number>;
  RelationTypeMapping: Record<string, { title: string; disableContextMenu: { value: boolean } }>;
  disableContextMenuAll: boolean;
  disableContextMenuOpenAsRoot: boolean;
  touchActionVisible: boolean;
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
  clickContextMenu: [reqType: RelationType];
  gotoNewRelationView: [];
  openContextNodeDetailDrawer: [];
  copyContextNodeCsv: [];
  gotoItemDetailView: [];
  touchActionClose: [];
  openTouchNodeDetailDrawer: [];
}>();

const setNetworkPaneRef = (el: Element | ComponentPublicInstance | null) => {
  props.setNetworkPaneElement?.((el as HTMLDivElement) || undefined);
};

const setNetworkChartRef = (el: Element | ComponentPublicInstance | null) => {
  props.setNetworkChartElement?.((el as HTMLDivElement) || undefined);
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

    <div :ref="setNetworkChartRef" class="network-chart"></div>

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

    <RelationGraphContextMenu
      :set-dropdown-instance="setDropdownInstance"
      :dropdown-style="dropdownStyle"
      :RelationTypeMapping="RelationTypeMapping"
      :disable-context-menu-all="disableContextMenuAll"
      :disable-context-menu-open-as-root="disableContextMenuOpenAsRoot"
      @click-context-menu="emit('clickContextMenu', $event)"
      @goto-new-relation-view="emit('gotoNewRelationView')"
      @open-context-node-detail-drawer="emit('openContextNodeDetailDrawer')"
      @copy-context-node-csv="emit('copyContextNodeCsv')"
      @goto-item-detail-view="emit('gotoItemDetailView')"
    />

    <RelationGraphTouchActions
      :touch-action-visible="touchActionVisible"
      :RelationTypeMapping="RelationTypeMapping"
      :disable-context-menu-all="disableContextMenuAll"
      :disable-context-menu-open-as-root="disableContextMenuOpenAsRoot"
      @click-context-menu="emit('clickContextMenu', $event)"
      @goto-new-relation-view="emit('gotoNewRelationView')"
      @open-touch-node-detail-drawer="emit('openTouchNodeDetailDrawer')"
      @copy-context-node-csv="emit('copyContextNodeCsv')"
      @goto-item-detail-view="emit('gotoItemDetailView')"
      @touch-action-close="emit('touchActionClose')"
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

@media (max-width: 767px) {
  .network-graph-pane {
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
  }

  .network-chart {
    order: 3;
    flex: 1 1 auto;
    min-height: 260px;
    height: auto;
  }
}
</style>
