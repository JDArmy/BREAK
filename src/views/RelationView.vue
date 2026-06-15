<script lang="ts">
import { defineComponent } from "vue";
import RelationNodeDetailDrawer from "@/components/relation/RelationNodeDetailDrawer.vue";
import RelationNetworkPane from "@/components/relation/RelationNetworkPane.vue";
import RelationSankeyPane from "@/components/relation/RelationSankeyPane.vue";
import RelationSelectorBar from "@/components/relation/RelationSelectorBar.vue";
import { useRelationViewModel } from "@/views/relation/useRelationViewModel";
import "element-plus/es/components/drawer/style/css";

export default defineComponent({
  name: "RelationView",
  components: {
    RelationNodeDetailDrawer,
    RelationNetworkPane,
    RelationSankeyPane,
    RelationSelectorBar,
  },
  setup: useRelationViewModel,
});
</script>

<template>
  <div class="relation-page">
    <RelationSelectorBar
      v-model:rel-type="relType"
      v-model:rel-key="relKey"
      :RelationTypeMapping="RelationTypeMapping"
      :get-current-entity-options="getCurrentEntityOptions"
    />

    <el-tabs v-model="activeView" class="relation-tabs">
      <el-tab-pane :label="$t('relationView.network')" name="network">
        <RelationNetworkPane
          :set-network-pane-element="setNetworkPaneElement"
          :set-network-chart-element="setNetworkChartElement"
          :set-dropdown-instance="setDropdownInstance"
          :network-layout-tooltip="networkLayoutTooltip"
          :network-layout-options="networkLayoutOptions"
          :network-state="networkState"
          :node-filter-visible="nodeFilterVisible"
          :line-filter-visible="lineFilterVisible"
          :filter-relation-type="filterRelationType"
          :filter-sub-node="filterSubNode"
          :filter-line-type="filterLineType"
          :relation-type-items="relationTypeItems"
          :sub-node-filter-color="subNodeFilterColor"
          :visible-relation-legend-items="visibleRelationLegendItems"
          :format-relation-fields-tooltip="formatRelationFieldsTooltip"
          :dropdown-style="dropdownStyle"
          :RelationTypeMapping="RelationTypeMapping"
          :disable-context-menu-all="disableContextMenuAll"
          :disable-context-menu-open-as-root="disableContextMenuOpenAsRoot"
          :touch-action-visible="touchActionVisible"
          @fullscreen="enterFullscreen"
          @zoom-in="zoomNetworkChart(0.08)"
          @zoom-out="zoomNetworkChart(-0.08)"
          @layout-command="handleNetworkLayoutCommand"
          @refresh="refreshNetworkChart"
          @download="downloadNetworkChart"
          @toggle-node-filter="toggleNodeFilter"
          @toggle-line-filter="toggleLineFilter"
          @open-node-detail="openNodeDetailDrawer"
          @update:node-filter-visible="nodeFilterVisible = $event"
          @update:line-filter-visible="lineFilterVisible = $event"
          @update:filter-relation-type="filterRelationType = $event"
          @update:filter-sub-node="filterSubNode = $event"
          @update:filter-line-type="filterLineType = $event"
          @filter="doFilter"
          @click-context-menu="clickContextMenu"
          @goto-new-relation-view="gotoNewRelationView"
          @open-context-node-detail-drawer="openContextNodeDetailDrawer"
          @copy-context-node-csv="copyContextNodeCsv"
          @goto-item-detail-view="gotoItemDetailView"
          @touch-action-close="touchActionClose"
          @open-touch-node-detail-drawer="openTouchNodeDetailDrawer"
        />
      </el-tab-pane>
      <el-tab-pane :label="$t('relationView.attackPath')" name="sankey">
        <RelationSankeyPane
          :sankey-data="sankeyData"
          :set-sankey-chart-element="setSankeyChartElement"
        />
      </el-tab-pane>
    </el-tabs>

    <RelationNodeDetailDrawer
      v-model="nodeDetailDrawerVisible"
      :selected-network-node="selectedNetworkNode"
      :selected-network-node-title="selectedNetworkNodeTitle"
      :selected-network-relation-counts="selectedNetworkRelationCounts"
      :root-node-relations="rootNodeRelations"
      :selected-node-root-path="selectedNodeRootPath"
      :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
      :selected-node-attack-path-description="selectedNodeAttackPathDescription"
      :selected-node-root-preview="selectedNodeRootPreview"
      :selected-network-relations="selectedNetworkRelations"
      :rel-key="relKey"
      :get-node-type-title="getNodeTypeTitle"
      :is-path-node-current-selection="isPathNodeCurrentSelection"
      :is-relation-on-selected-path="isRelationOnSelectedPath"
      :is-current-node-root="isCurrentNodeRoot"
      :drawer-copy-feedback-message="drawerCopyFeedbackMessage"
      :drawer-copy-feedback-type="drawerCopyFeedbackType"
      @copy-csv="copySelectedNodeCsv"
      @view-detail="gotoSelectedNodeDetailView"
      @open-detail-new-window="openSelectedNodeDetailInNewWindow"
      @open-as-root="openSelectedNodeAsRoot"
      @focus-node="focusNodeInDrawer"
      @open-node-detail="gotoNodeDetailViewById"
      @open-node-as-root="openNodeAsRootById"
    />
  </div>
</template>

<style scoped>
.relation-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 132px);
  min-height: 480px;
  overflow: hidden;
  padding: 0 12px 4px;
}

.relation-tabs {
  min-height: 0;
  flex: 1;
}

.relation-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

.relation-tabs :deep(.el-tabs__nav-wrap) {
  padding-right: min(700px, calc(100vw - 360px));
}

.relation-tabs :deep(.el-tabs__nav-wrap) {
  min-height: 40px;
}

.relation-tabs :deep(.el-tabs__content) {
  height: calc(100% - 48px);
}

.relation-tabs :deep(.el-tab-pane) {
  height: 100%;
}

@media (max-width: 767px) {
  .relation-tabs :deep(.el-tabs__header) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .relation-tabs :deep(.el-tabs__nav-wrap) {
    padding-right: 0;
  }
}
</style>
