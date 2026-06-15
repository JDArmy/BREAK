import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import BREAK from "@/BREAK";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { use } from "echarts/core";
import { GraphChart, SankeyChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { DropdownInstance } from "element-plus";
import {
  createNetworkChartController,
  createSankeyChartController,
} from "@/views/relation/relationChartControllers";
import { createNetworkDataHelpers } from "@/views/relation/relationNetworkLayout";
import {
  RelationType,
  createRelationTypeMapping,
  graphColors,
  networkLayoutOptions,
  networkLayoutZoom,
  relationLineColors,
  relationTypeColors,
  type NetworkLayoutMode,
  type SankeyNode,
} from "@/views/relation/relationTypes";
import { useRelationGraphData } from "@/views/relation/useRelationGraphData";
import { useRelationNodeActions } from "@/views/relation/useRelationNodeActions";

use([GraphChart, SankeyChart, LegendComponent, TooltipComponent, CanvasRenderer]);

export const useRelationViewModel = () => {
  const route = useRoute();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isDark } = useTheme();
  const { isMobile, width } = useBreakpoints();

  const getRelationTypeColor = (type: Exclude<RelationType, RelationType.all>) =>
    isDark.value ? relationTypeColors[type].dark : relationTypeColors[type].light;

  const RelationTypeMapping = createRelationTypeMapping(
    (key) => t(key),
    getRelationTypeColor
  );

  const relType = ref<RelationType>(route.params.type as RelationType);
  const relKey = ref<string>(route.params.key as string);
  const activeView = ref<"network" | "sankey">(isMobile.value ? "sankey" : "network");

  const networkState = reactive({
    zoom: networkLayoutZoom.horizontal,
    layout: "horizontal" as NetworkLayoutMode,
  });

  const activeNetworkLayoutLabel = computed(
    () =>
      t(
        networkLayoutOptions.find((layout) => layout.value === networkState.layout)?.labelKey ??
          "relationLayout.horizontal"
      )
  );

  const networkLayoutTooltip = computed(
    () => `${t("toolbar.layout")}: ${activeNetworkLayoutLabel.value}`
  );

  const getGraphColor = (key: keyof typeof graphColors) =>
    isDark.value ? graphColors[key].dark : graphColors[key].light;

  const getRelationLineColor = (key: keyof typeof relationLineColors) =>
    isDark.value ? relationLineColors[key].dark : relationLineColors[key].light;

  const renderNetworkChartBridge: { current: (notMerge?: boolean) => void } = {
    current: () => {},
  };

  const graphData = useRelationGraphData({
    t,
    isDark,
    relType,
    relKey,
    RelationTypeMapping,
    getGraphColor,
    getRelationLineColor,
    renderNetworkChart: (notMerge) => renderNetworkChartBridge.current(notMerge),
  });

  const {
    addRootNode,
    buildNodeSummary,
    clearDraggedNodePositions,
    draggedNodePositions,
    filterLineType,
    filterRelationType,
    filterSubNode,
    findNodeById,
    formatRelationFieldsTooltip,
    genNetworkGraphData,
    getCurrentEntityOptions,
    getNodeTypeTitle,
    getRelationSourceFields,
    isDirectRelationLine,
    isPathNodeCurrentSelection,
    isRelationOnSelectedPath,
    lines,
    nodes,
    rebuildGraphData,
    refreshGraphAfterVisible,
    relationLegendItems,
    relationTypeItems,
    rootNodeRelations,
    sankeyChartHeight,
    sankeyData,
    selectedNetworkNode,
    selectedNetworkNodeId,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathSummary,
    selectedNodeRootPath,
    selectedNodeRootPreview,
    subNodeFilterColor,
    visibleRelationLegendItems,
    wrapLabelText,
  } = graphData;

  const { getVisibleNetworkData, toContextNode } = createNetworkDataHelpers({
    nodes,
    lines,
    relKey,
    selectedNetworkNodeId,
    filterRelationType,
    filterSubNode,
    filterLineType,
    draggedNodePositions,
    networkState,
    relationLegendItems,
    isDark,
    wrapLabelText,
    getGraphColor,
    getRelationSourceFields,
    findNodeById,
  });

  const selectSankeyNode = (node: SankeyNode) => {
    relType.value = node.entityType;
    relKey.value = node.entityKey;
  };

  const sankeyRight = computed(() => {
    if (isMobile.value) return 80;
    if (width.value < 992) return 160;
    return 280;
  });

  const sankeyLabelWidth = computed(() => {
    if (isMobile.value) return 100;
    if (width.value < 992) return 160;
    return 220;
  });

  const {
    disposeSankeyChart,
    renderSankeyChart,
    resizeSankeyChart,
    sankeyChartRef,
  } = createSankeyChartController({
    t,
    isDark,
    activeView,
    sankeyChartHeight,
    sankeyData,
    sankeyRight,
    sankeyLabelWidth,
    onSelectNode: selectSankeyNode,
  });

  const dropdown1 = ref<DropdownInstance>();
  const networkInteractionsBridge = {
    handleNodeTouch: (() => {}) as (node: ReturnType<typeof toContextNode>) => void,
    nodeClick: (() => {}) as (node: ReturnType<typeof toContextNode>, event: MouseEvent) => void,
  };
  const {
    disposeNetworkChart,
    downloadNetworkChart,
    enterFullscreen,
    networkChartRef,
    networkPaneRef,
    renderNetworkChart,
    resizeNetworkChart,
  } = createNetworkChartController({
    t,
    isDark,
    isMobile,
    activeView,
    networkState,
    selectedNetworkNodeId,
    draggedNodePositions,
    getVisibleNetworkData,
    getGraphColor,
    toContextNode,
    getDownloadFilename: () => `relation-${relType.value}-${relKey.value}.png`,
    interactionsBridge: networkInteractionsBridge,
  });
  renderNetworkChartBridge.current = renderNetworkChart;
  const {
    clickContextMenu,
    copyContextNodeCsv,
    disableContextMenuAll,
    disableContextMenuOpenAsRoot,
    doFilter,
    dropdownStyle,
    focusNodeInDrawer,
    gotoItemDetailView,
    gotoNewRelationView,
    gotoSelectedNodeDetailView,
    handleGlobalPointerDown,
    handleNodeTouch,
    lineFilterVisible,
    nodeClick,
    nodeDetailDrawerVisible,
    nodeFilterVisible,
    openContextNodeDetailDrawer,
    openNodeAsRootById,
    openNodeDetailDrawer,
    openSelectedNodeAsRoot,
    openTouchNodeDetailDrawer,
    toggleLineFilter,
    toggleNodeFilter,
    touchActionClose,
    touchActionVisible,
  } = useRelationNodeActions({
    t,
    router,
    networkPaneRef,
    dropdown1,
    relKey,
    lines,
    selectedNetworkNode,
    selectedNetworkNodeId,
    RelationTypeMapping,
    findNodeById,
    buildNodeSummary,
    isDirectRelationLine,
    getRelationSourceFields,
    genNetworkGraphData,
    renderNetworkChart,
  });
  networkInteractionsBridge.handleNodeTouch = (node) => handleNodeTouch(node as ReturnType<typeof toContextNode>);
  networkInteractionsBridge.nodeClick = (node, event) =>
    nodeClick(node as ReturnType<typeof toContextNode>, event);

  const zoomNetworkChart = (step: number) => {
    networkState.zoom = Math.min(3, Math.max(0.12, networkState.zoom + step));
    renderNetworkChart(true);
  };

  const changeNetworkLayout = (layout: NetworkLayoutMode) => {
    networkState.layout = layout;
    networkState.zoom = networkLayoutZoom[layout];
    clearDraggedNodePositions();
    renderNetworkChart(true);
  };

  const handleNetworkLayoutCommand = (command: string | number | object) => {
    const layout = command as NetworkLayoutMode;
    if (networkLayoutOptions.some((option) => option.value === layout)) {
      changeNetworkLayout(layout);
    }
  };

  const refreshNetworkChart = () => {
    renderNetworkChart(true);
  };


  onMounted(() => {
    if (
      !Object.values(RelationType).includes(route.params.type as RelationType) ||
      !Object.keys(
        BREAK[
          RelationTypeMapping[
            route.params.type as keyof typeof RelationTypeMapping
          ].BreakKey as keyof typeof BREAK
        ]
      ).includes(route.params.key as string)
    ) {
      alert(t("unknownTypeOrId"));
      router
        .push({
          name: "relation",
          params: {
            type: "risk",
            key: "R0001",
          },
        })
        .then(() => {
          location.reload();
        });
      return;
    }
    addRootNode();
    genNetworkGraphData(RelationType.all, relType.value, relKey.value);
    nextTick(() => {
      renderNetworkChart(true);
      renderSankeyChart();
    });
    window.addEventListener("resize", resizeNetworkChart);
    window.addEventListener("resize", resizeSankeyChart);
    document.addEventListener("pointerdown", handleGlobalPointerDown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", resizeNetworkChart);
    window.removeEventListener("resize", resizeSankeyChart);
    document.removeEventListener("pointerdown", handleGlobalPointerDown);
    disposeNetworkChart();
    disposeSankeyChart();
  });

  watch(
    () => relType.value,
    () => {
      if (!Object.keys(getCurrentEntityOptions.value).includes(relKey.value)) {
        relKey.value = Object.keys(getCurrentEntityOptions.value)[0] ?? "";
      }
    }
  );

  watch(
    () => [relType.value, relKey.value],
    ([newType, newKey]) => {
      if (newType !== route.params.type || newKey !== route.params.key) {
        router.push({
          name: "relation",
          params: {
            type: newType,
            key: newKey,
          },
        });
      }
    }
  );

  watch(
    () => [route.params.type, route.params.key],
    () => {
      relType.value = route.params.type as RelationType;
      relKey.value = route.params.key as string;
      refreshGraphAfterVisible();
    }
  );

  watch(locale, () => {
    filterLineType.value = [];
    rebuildGraphData();
    nextTick(() => {
      renderNetworkChart(true);
      renderSankeyChart();
    });
  });

  watch(activeView, () => {
    if (activeView.value === "sankey") {
      nextTick(renderSankeyChart);
    } else {
      nextTick(() => renderNetworkChart(true));
    }
  });

  watch(
    sankeyData,
    () => {
      if (activeView.value === "sankey") {
        nextTick(renderSankeyChart);
      }
    },
    { deep: true }
  );

  watch(isDark, () => {
    renderNetworkChart(true);
    nextTick(renderSankeyChart);
  });

  watch(selectedNetworkNodeId, () => {
    if (activeView.value === "network") {
      nextTick(() => renderNetworkChart(true));
    }
  });

  return {
    RelationType,
    RelationTypeMapping,
    activeView,
    clickContextMenu,
    copyContextNodeCsv,
    disableContextMenuAll,
    disableContextMenuOpenAsRoot,
    doFilter,
    downloadNetworkChart,
    dropdown1,
    dropdownStyle,
    enterFullscreen,
    filterLineType,
    filterRelationType,
    filterSubNode,
    focusNodeInDrawer,
    formatRelationFieldsTooltip,
    getCurrentEntityOptions,
    getNodeTypeTitle,
    gotoItemDetailView,
    gotoNewRelationView,
    gotoSelectedNodeDetailView,
    handleNetworkLayoutCommand,
    isPathNodeCurrentSelection,
    isRelationOnSelectedPath,
    lineFilterVisible,
    networkChartRef,
    networkLayoutOptions,
    networkLayoutTooltip,
    networkPaneRef,
    networkState,
    nodeDetailDrawerVisible,
    nodeFilterVisible,
    openContextNodeDetailDrawer,
    openNodeAsRootById,
    openNodeDetailDrawer,
    openSelectedNodeAsRoot,
    openTouchNodeDetailDrawer,
    refreshNetworkChart,
    relKey,
    relType,
    relationTypeItems,
    rootNodeRelations,
    sankeyChartRef,
    sankeyData,
    selectedNetworkNode,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathSummary,
    selectedNodeRootPath,
    selectedNodeRootPreview,
    subNodeFilterColor,
    toggleLineFilter,
    toggleNodeFilter,
    touchActionClose,
    touchActionVisible,
    visibleRelationLegendItems,
    zoomNetworkChart,
  };
};
