<script lang="ts">
import { defineAsyncComponent, defineComponent, onMounted } from "vue";
import RelationGraphContextMenu from "@/components/relation/RelationGraphContextMenu.vue";
import RelationGraphTouchActions from "@/components/relation/RelationGraphTouchActions.vue";
import RelationSankeyPane from "@/components/relation/RelationSankeyPane.vue";
import RelationSelectorBar from "@/components/relation/RelationSelectorBar.vue";
import { useRelationViewModel } from "@/views/relation/useRelationViewModel";
import { loadNetworkECharts, loadSankeyECharts } from "@/views/relation/relationECharts";
import "element-plus/es/components/drawer/style/css";

const loadRelationNetworkPane = () => import("@/components/relation/RelationNetworkPane.vue");
const loadRelationNodeDetailDrawer = () => import("@/components/relation/RelationNodeDetailDrawer.vue");
const RelationNetworkPane = defineAsyncComponent(loadRelationNetworkPane);
const RelationNodeDetailDrawer = defineAsyncComponent(loadRelationNodeDetailDrawer);

export default defineComponent({
  name: "RelationView",
  components: {
    RelationNodeDetailDrawer,
    RelationGraphContextMenu,
    RelationGraphTouchActions,
    RelationNetworkPane,
    RelationSankeyPane,
    RelationSelectorBar,
  },
  setup() {
    const viewModel = useRelationViewModel();
    onMounted(() => {
      const isMobileViewport = window.innerWidth < 768;
      const schedulePreload = () => {
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(preloadSecondaryView, { timeout: 3000 });
        } else {
          preloadSecondaryView();
        }
      };
      const preloadSecondaryView = () => {
        void loadRelationNodeDetailDrawer();
        if (viewModel.activeView.value === "sankey") {
          void loadRelationNetworkPane();
          void loadNetworkECharts();
        } else {
          void loadSankeyECharts();
        }
      };
      if (isMobileViewport) {
        window.setTimeout(schedulePreload, 12000);
      } else if ("requestIdleCallback" in window) {
        window.requestIdleCallback(preloadSecondaryView, { timeout: 1500 });
      } else {
        window.setTimeout(preloadSecondaryView, 800);
      }
    });
    return viewModel;
  },
});
</script>

<template>
  <div
    :ref="setRelationPageElement"
    class="relation-page"
    :class="{ 'relation-page--mobile-sankey': activeView === 'sankey' }"
  >
    <RelationSelectorBar
      v-model:rel-type="relType"
      v-model:rel-key="relKey"
      :RelationTypeMapping="RelationTypeMapping"
      :get-current-entity-options="getCurrentEntityOptions"
    />

    <el-tabs v-model="activeView" class="relation-tabs">
      <el-tab-pane :label="$t('relationView.network')" name="network" :lazy="activeView !== 'network'">
        <RelationNetworkPane
          :set-network-pane-element="setNetworkPaneElement"
          :set-network-scroller-element="setNetworkScrollerElement"
          :set-network-chart-element="setNetworkChartElement"
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
        />
      </el-tab-pane>
      <el-tab-pane :label="$t('relationView.attackPath')" name="sankey" :lazy="activeView !== 'sankey'">
        <RelationSankeyPane
          :active="activeView === 'sankey'"
          :has-data="sankeyHasData"
          :chart-min-width="sankeyChartMinWidth"
          :relation-type-mapping="RelationTypeMapping"
          :attack-path-details="attackPathDetails"
          :attack-path-filter-options="attackPathFilterOptions"
          :attack-path-filters="attackPathFilters"
          :filtered-attack-path-count="filteredAttackPaths.length"
          :has-active-attack-path-filters="hasActiveAttackPathFilters"
          :risk-avoidance-coverage="riskAvoidanceCoverage"
          :selected-attack-path-detail="selectedAttackPathDetail"
          :selected-attack-path-id="selectedAttackPathDetail?.id || ''"
          :set-sankey-chart-element="setSankeyChartElement"
          @update:attack-path-filters="attackPathFilters = $event"
          @select-attack-path="selectAttackPath"
          @reset-attack-path-filters="resetAttackPathFilters"
        />
      </el-tab-pane>
    </el-tabs>

    <RelationGraphContextMenu
      :set-dropdown-instance="setDropdownInstance"
      :dropdown-style="dropdownStyle"
      :RelationTypeMapping="RelationTypeMapping"
      :disable-context-menu-all="disableContextMenuAll"
      :disable-context-menu-open-as-root="disableContextMenuOpenAsRoot"
      :show-relation-fetch-actions="activeView === 'network'"
      @click-context-menu="clickContextMenu"
      @goto-new-relation-view="gotoNewRelationView"
      @open-context-node-detail-drawer="openContextNodeDetailDrawer"
      @copy-context-node-csv="copyContextNodeCsv"
      @goto-item-detail-view="gotoItemDetailView"
    />

    <RelationGraphTouchActions
      :touch-action-visible="touchActionVisible"
      :RelationTypeMapping="RelationTypeMapping"
      :disable-context-menu-all="disableContextMenuAll"
      :disable-context-menu-open-as-root="disableContextMenuOpenAsRoot"
      :show-relation-fetch-actions="activeView === 'network'"
      @click-context-menu="clickContextMenu"
      @goto-new-relation-view="gotoNewRelationView"
      @open-touch-node-detail-drawer="openTouchNodeDetailDrawer"
      @copy-context-node-csv="copyContextNodeCsv"
      @goto-item-detail-view="gotoItemDetailView"
      @touch-action-close="touchActionClose"
    />

    <RelationNodeDetailDrawer
      v-if="nodeDetailDrawerVisible"
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
  .relation-page {
    height: calc(100dvh - 94px);
    min-height: 0;
    padding: 0 6px 2px;
  }

  .relation-tabs {
    min-height: 0;
  }

  .relation-tabs :deep(.el-tabs__header) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 4px;
  }

  .relation-tabs :deep(.el-tabs__nav-wrap) {
    padding-right: 0;
    min-height: 34px;
  }

  .relation-tabs :deep(.el-tabs__item) {
    height: 34px;
    line-height: 34px;
  }

  .relation-tabs :deep(.el-tabs__content) {
    height: calc(100% - 38px);
  }

  .relation-page--mobile-sankey {
    height: auto;
    overflow: visible;
  }

  .relation-page--mobile-sankey .relation-tabs {
    flex: none;
  }

  .relation-page--mobile-sankey :deep(.el-tabs__content) {
    height: auto;
  }

  .relation-page--mobile-sankey :deep(.el-tab-pane) {
    height: auto;
  }
}
</style>
