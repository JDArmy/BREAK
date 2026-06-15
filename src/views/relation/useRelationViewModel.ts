import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { use } from "echarts/core";
import { GraphChart, SankeyChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  createRelationDropdownRef,
  createNetworkInteractionsBridge,
  createRenderNetworkChartBridge,
} from "@/views/relation/relationViewBridges";
import { createNetworkChartController, createSankeyChartController } from "@/views/relation/relationViewControllers";
import { createNetworkDataHelpers } from "@/views/relation/relationNetworkLayout";
import { createRelationViewState } from "@/views/relation/relationViewState";
import { setupRelationViewEffects } from "@/views/relation/relationViewEffects";
import {
  createRelationTypeMapping,
  graphColors,
  networkLayoutOptions,
  relationLineColors,
  relationTypeColors,
  RelationType,
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

  const getGraphColor = (key: keyof typeof graphColors) =>
    isDark.value ? graphColors[key].dark : graphColors[key].light;

  const getRelationLineColor = (key: keyof typeof relationLineColors) =>
    isDark.value ? relationLineColors[key].dark : relationLineColors[key].light;

  const renderNetworkChartBridge = createRenderNetworkChartBridge();
  const {
    activeView,
    handleNetworkLayoutCommand,
    networkLayoutTooltip,
    networkState,
    refreshNetworkChart,
    relKey,
    relType,
    sankeyLabelWidth,
    sankeyRight,
    setClearDraggedNodePositions,
    selectSankeyNode,
    zoomNetworkChart,
  } = createRelationViewState({
    route,
    t,
    isMobile,
    width,
    renderNetworkChartBridge,
  });

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

  const dropdown1 = createRelationDropdownRef();
  const networkInteractionsBridge = createNetworkInteractionsBridge<ReturnType<typeof toContextNode>>();
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
  setClearDraggedNodePositions(clearDraggedNodePositions);

  setupRelationViewEffects({
    t,
    route,
    router,
    locale,
    isDark,
    activeView,
    relType,
    relKey,
    sankeyData,
    getCurrentEntityOptions,
    RelationTypeMapping,
    addRootNode,
    genNetworkGraphData,
    rebuildGraphData,
    refreshGraphAfterVisible,
    renderNetworkChart,
    renderSankeyChart,
    resizeNetworkChart,
    resizeSankeyChart,
    handleGlobalPointerDown,
    disposeNetworkChart,
    disposeSankeyChart,
    filterLineType,
    selectedNetworkNodeId,
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
