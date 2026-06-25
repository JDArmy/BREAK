<script lang="ts">
import { defineAsyncComponent, defineComponent, onMounted, onUnmounted } from "vue";
import RelationAnalysisPane from "@/components/relation/RelationAnalysisPane.vue";
import RelationGraphContextMenu from "@/components/relation/RelationGraphContextMenu.vue";
import RelationGraphTouchActions from "@/components/relation/RelationGraphTouchActions.vue";
import RelationSankeyPane from "@/components/relation/RelationSankeyPane.vue";
import RelationSelectorBar from "@/components/relation/RelationSelectorBar.vue";
import { useRelationViewModel } from "@/views/relation/useRelationViewModel";
import { RelationType } from "@/views/relation/relationTypes";
import {
  loadNetworkECharts,
  loadSankeyECharts,
} from "@/views/relation/relationECharts";

const loadRelationNetworkPane = () =>
  import("@/components/relation/RelationNetworkPane.vue");
const loadRelationNodeDetailDrawer = () =>
  import("@/components/relation/RelationNodeDetailDrawer.vue");
const loadRelationPathExplorerPane = () =>
  import("@/components/relation/RelationPathExplorerPane.vue");
const RelationNetworkPane = defineAsyncComponent(loadRelationNetworkPane);
const RelationNodeDetailDrawer = defineAsyncComponent(
  loadRelationNodeDetailDrawer
);
const RelationPathExplorerPane = defineAsyncComponent(loadRelationPathExplorerPane);

export default defineComponent({
  name: "RelationView",
  components: {
    RelationNodeDetailDrawer,
    RelationAnalysisPane,
    RelationGraphContextMenu,
    RelationGraphTouchActions,
    RelationNetworkPane,
    RelationPathExplorerPane,
    RelationSankeyPane,
    RelationSelectorBar,
  },
  setup() {
    const viewModel = useRelationViewModel();
    let preloadTimer: ReturnType<typeof setTimeout> | null = null;
    let preloadIdleHandle: number | null = null;
    onMounted(() => {
      const isMobileViewport = window.innerWidth < 768;
      const schedulePreload = () => {
        if ("requestIdleCallback" in window) {
          preloadIdleHandle = window.requestIdleCallback(preloadSecondaryView, { timeout: 3000 });
        } else {
          preloadSecondaryView();
        }
      };
      const preloadSecondaryView = () => {
        preloadIdleHandle = null;
        void loadRelationNodeDetailDrawer();
        if (viewModel.activeView.value === "sankey") {
          void loadRelationNetworkPane();
          void loadNetworkECharts();
        } else {
          void loadSankeyECharts();
        }
      };
      if (isMobileViewport) {
        preloadTimer = window.setTimeout(schedulePreload, 12000);
      } else if ("requestIdleCallback" in window) {
        preloadIdleHandle = window.requestIdleCallback(preloadSecondaryView, { timeout: 1500 });
      } else {
        preloadTimer = window.setTimeout(preloadSecondaryView, 800);
      }
    });
    onUnmounted(() => {
      if (preloadTimer !== null) {
        clearTimeout(preloadTimer);
        preloadTimer = null;
      }
      if (preloadIdleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(preloadIdleHandle);
        preloadIdleHandle = null;
      }
    });
    return {
      ...viewModel,
      RelationType,
      onTabChange: (name: string | number) => {
        // el-tabs 切换：交由 switchPerspective 路由跳转到目标视角
        viewModel.switchPerspective(name as "network" | "sankey" | "analysis" | "pathExplorer");
      },
    };
  },
});
</script>

<template>
  <div
    :ref="setRelationPageElement"
    class="relation-page"
    :class="{
      'relation-page--mobile-sankey': activeView === 'sankey',
      'relation-page--mobile-network': activeView === 'network',
      'relation-page--path-explorer': activeView === 'pathExplorer',
    }"
  >
    <RelationSelectorBar
      v-model:rel-type="relType"
      v-model:rel-key="relKey"
      :RelationTypeMapping="RelationTypeMapping"
      :get-current-entity-options="getCurrentEntityOptions"
    />

    <el-tabs :model-value="activeView" class="relation-tabs" @tab-change="onTabChange">
      <el-tab-pane
        :label="$t('relationView.perspective.risk.title')"
        name="network"
        :lazy="activeView !== 'network'"
      >
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
          :filter-related-entity="filterRelatedEntity"
          :filter-line-type="filterLineType"
          :relation-type-items="relationTypeItems"
          :sub-node-filter-color="subNodeFilterColor"
          :visible-relation-legend-items="visibleRelationLegendItems"
          :format-relation-fields-tooltip="formatRelationFieldsTooltip"
          :selected-relation-detail="selectedNetworkRelationDetail"
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
          @update:filter-related-entity="filterRelatedEntity = $event"
          @update:filter-line-type="filterLineType = $event"
          @filter="doFilter"
          @close-relation-detail="closeNetworkRelationDetail"
        />
      </el-tab-pane>
      <el-tab-pane
        :label="$t('relationView.perspective.attackPath.title')"
        name="sankey"
        :lazy="activeView !== 'sankey'"
      >
        <RelationSankeyPane
          :active="activeView === 'sankey'"
          :has-data="sankeyHasData"
          :chart-min-width="sankeyChartMinWidth"
          :set-sankey-chart-element="setSankeyChartElement"
        />
      </el-tab-pane>
      <el-tab-pane
        :label="$t('relationView.perspective.defenseCoverage.title')"
        name="analysis"
        :lazy="activeView !== 'analysis'"
      >
        <RelationAnalysisPane
          :active="activeView === 'analysis'"
          :relation-type-mapping="RelationTypeMapping"
          :attack-path-details="attackPathDetails"
          :attack-path-filter-options="attackPathFilterOptions"
          :attack-path-filters="attackPathFilters"
          :filtered-attack-path-count="filteredAttackPaths.length"
          :has-active-attack-path-filters="hasActiveAttackPathFilters"
          :risk-avoidance-coverage="riskAvoidanceCoverage"
          :selected-attack-path-detail="selectedAttackPathDetail"
          :selected-network-node="selectedNetworkNode"
          :selected-node-analysis-summary="selectedNodeAnalysisSummary"
          :selected-node-related-entity-summary="selectedNodeRelatedEntitySummary"
          :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
          :selected-node-attack-path-description="selectedNodeAttackPathDescription"
          :selected-node-attack-path-explanations="
            selectedNodeAttackPathExplanations
          "
          :selected-node-business-scene-impact-summary="
            selectedNodeBusinessSceneImpactSummary
          "
          :selected-node-coverage-summary="selectedNodeCoverageSummary"
          :selected-node-special-insight-summary="selectedNodeSpecialInsightSummary"
          :selected-network-node-title="selectedNetworkNodeTitle"
          :selected-network-relation-counts="selectedNetworkRelationCounts"
          :selected-network-relations="selectedNetworkRelations"
          :root-node-relations="rootNodeRelations"
          :selected-node-root-path="selectedNodeRootPath"
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
          @update:attack-path-filters="attackPathFilters = $event"
          @reset-attack-path-filters="resetAttackPathFilters"
          @select-attack-path="selectAttackPath"
          @apply-avoidance-filter="
            attackPathFilters = {
              ...(attackPathFilters || {}),
              [RelationType.avoidance]: $event,
            }
          "
          @focus-node="focusNodeInDrawer"
          @open-node-as-root="openNodeAsRootById"
          @open-node-detail="gotoNodeDetailViewById"
        />
      </el-tab-pane>
      <el-tab-pane
        :label="$t('relationView.pathExplorer')"
        name="pathExplorer"
        :lazy="activeView !== 'pathExplorer'"
      >
        <RelationPathExplorerPane
          :active="activeView === 'pathExplorer'"
          :rel-type="relType"
          :rel-key="relKey"
          :RelationTypeMapping="RelationTypeMapping"
          :path-explorer-sankey-data="pathExplorerSankeyData"
          :path-explorer-has-data="pathExplorerHasData"
          :path-explorer-chart-height="pathExplorerChartHeight"
          :path-explorer-chart-min-width="sankeyChartMinWidth"
          :path-explorer-stats="pathExplorerStats"
          :has-target="hasTarget"
          :searching="searching"
          :set-path-explorer-chart-element="pathExplorerSankeyController.setSankeyChartElement"
          :initial-end-type="pathExplorerEndType"
          :initial-end-key="pathExplorerEndKey"
          :initial-max-depth="pathExplorerMaxDepth"
          :initial-max-paths="pathExplorerMaxPaths"
          @update:start-type="pathExplorerStartType = $event"
          @update:start-key="pathExplorerStartKey = $event"
          @update:end-type="pathExplorerEndType = $event"
          @update:end-key="pathExplorerEndKey = $event"
          @update:max-depth="pathExplorerMaxDepth = $event"
          @update:max-paths="pathExplorerMaxPaths = $event"
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
      :selected-node-analysis-summary="selectedNodeAnalysisSummary"
      :selected-node-related-entity-summary="selectedNodeRelatedEntitySummary"
      :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
      :selected-node-attack-path-description="selectedNodeAttackPathDescription"
      :selected-node-attack-path-explanations="
        selectedNodeAttackPathExplanations
      "
      :attack-path-filter-options="attackPathFilterOptions"
      :attack-path-filters="attackPathFilters"
      :has-active-attack-path-filters="hasActiveAttackPathFilters"
      :selected-node-business-scene-impact-summary="
        selectedNodeBusinessSceneImpactSummary
      "
      :selected-node-coverage-summary="selectedNodeCoverageSummary"
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
      @update:attack-path-filters="attackPathFilters = $event"
      @reset-attack-path-filters="resetAttackPathFilters"
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

/* 路径探索模式：允许页面滚动，图表限高 1 屏 */
.relation-page--path-explorer {
  height: auto;
  min-height: 0;
  overflow: visible;
}

.relation-page--path-explorer .relation-tabs {
  flex: none;
}

.relation-page--path-explorer :deep(.el-tabs__content) {
  height: auto;
}

.relation-page--path-explorer :deep(.el-tab-pane) {
  height: auto;
}

@media (max-width: 767px) {
  .relation-page {
    height: auto;
    min-height: 0;
    overflow: visible;
    padding: 0 6px 2px;
  }

  .relation-tabs {
    min-height: 0;
    height: auto;
    overflow: visible;
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
    height: auto;
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

  .relation-page :deep(.el-tab-pane) {
    overflow: visible;
  }

  /* 关系网络在移动端限制为一屏：面板限高、画布在面板内通过 ECharts 缩放/拖拽浏览，
     不再把页面整体撑高到超出一屏。 */
  .relation-page--mobile-network {
    height: calc(100dvh - 130px);
    min-height: 0;
    overflow: hidden;
  }

  .relation-page--mobile-network .relation-tabs {
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }

  .relation-page--mobile-network :deep(.el-tabs__content) {
    height: calc(100% - 41px);
    min-height: 0;
    overflow: hidden;
  }

  .relation-page--mobile-network :deep(.el-tab-pane) {
    height: 100%;
    overflow: hidden;
  }
}
</style>
