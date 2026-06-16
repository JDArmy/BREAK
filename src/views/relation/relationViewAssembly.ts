import { createNetworkDataHelpers } from "@/views/relation/relationNetworkLayout";
import { createNetworkChartController, createSankeyChartController } from "@/views/relation/relationViewControllers";
import { setupRelationViewEffects } from "@/views/relation/relationViewEffects";
import { createRelationViewState } from "@/views/relation/relationViewState";
import { useRelationGraphData } from "@/views/relation/useRelationGraphData";
import { useRelationNodeActions } from "@/views/relation/useRelationNodeActions";
import { logRelationPerf, measureRelationPerf, relationPerfNow } from "@/views/relation/relationPerf";
import type { createRelationTypeMapping, graphColors, relationLineColors } from "@/views/relation/relationTypes";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import type { DropdownInstance } from "element-plus";
import type { Ref } from "vue";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationViewAssemblyOptions {
  route: RouteLocationNormalizedLoaded;
  router: Router;
  t: Translate;
  locale: Ref<string>;
  isDark: Ref<boolean>;
  isMobile: Ref<boolean>;
  width: Ref<number>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getGraphColor: (key: keyof typeof graphColors) => string;
  getRelationLineColor: (key: keyof typeof relationLineColors) => string;
  renderNetworkChartBridge: { current: (notMerge?: boolean) => void };
  dropdown1: Ref<DropdownInstance | undefined>;
  setDropdownInstance: (instance: DropdownInstance | undefined) => void;
  networkInteractionsBridge: {
    handleNodeTouch: (node: unknown) => void;
    nodeClick: (node: unknown, event: MouseEvent) => void;
  };
}

export const createRelationViewAssembly = ({
  route,
  router,
  t,
  locale,
  isDark,
  isMobile,
  width,
  RelationTypeMapping,
  getGraphColor,
  getRelationLineColor,
  renderNetworkChartBridge,
  dropdown1,
  setDropdownInstance,
  networkInteractionsBridge,
}: CreateRelationViewAssemblyOptions) => {
  const assemblyStartedAt = relationPerfNow();
  logRelationPerf("assembly start");
  const viewStateStartedAt = relationPerfNow();
  const viewState = createRelationViewState({
    route,
    t,
    isMobile,
    width,
    renderNetworkChartBridge,
  });
  measureRelationPerf("create relation view state done", viewStateStartedAt);

  const destructureViewStateStartedAt = relationPerfNow();
  const {
    activeView,
    handleNetworkLayoutCommand,
    networkLayoutTooltip,
    networkState,
    refreshNetworkChart,
    relKey,
    relType,
    sankeyBottom,
    sankeyChartMinWidth,
    sankeyLabelFontSize,
    sankeyLabelLineHeight,
    sankeyLabelOverflow,
    sankeyLabelWidth,
    sankeyLayoutIterations,
    sankeyLeft,
    sankeyNodeAlign,
    sankeyNodeGap,
    sankeyNodeWidth,
    sankeyRight,
    sankeyTop,
    setClearDraggedNodePositions,
    selectSankeyNode,
    zoomNetworkChart,
  } = viewState;
  measureRelationPerf("destructure relation view state done", destructureViewStateStartedAt);

  const graphDataStartedAt = relationPerfNow();
  const graphData = useRelationGraphData({
    t,
    isDark,
    isMobile,
    relType,
    relKey,
    RelationTypeMapping,
    getGraphColor,
    getRelationLineColor,
    renderNetworkChart: (notMerge) => renderNetworkChartBridge.current(notMerge),
  });
  measureRelationPerf("use relation graph data done", graphDataStartedAt);

  const destructureGraphDataStartedAt = relationPerfNow();
  const {
    addRootNode,
    clearDraggedNodePositions,
    buildNodeSummary,
    genNetworkGraphData,
    isDirectRelationLine,
    rebuildGraphData,
    refreshGraphAfterVisible,
    getRelationSourceFields,
    lines,
    selectedNetworkNode,
    selectedNetworkNodeId,
  } = graphData;
  measureRelationPerf("destructure graph data done", destructureGraphDataStartedAt);

  const networkHelpersStartedAt = relationPerfNow();
  const { getVisibleNetworkData, toContextNode } = createNetworkDataHelpers({
    nodes: graphData.nodes,
    lines: graphData.lines,
    relKey,
    selectedNetworkNodeId,
    filterRelationType: graphData.filterRelationType,
    filterSubNode: graphData.filterSubNode,
    filterLineType: graphData.filterLineType,
    draggedNodePositions: graphData.draggedNodePositions,
    networkState,
    relationLegendItems: graphData.relationLegendItems,
    isDark,
    getRelationTypeColor: (type) => RelationTypeMapping[type].color,
    wrapLabelText: graphData.wrapLabelText,
    getGraphColor,
    getRelationSourceFields,
  });
  measureRelationPerf("create network data helpers done", networkHelpersStartedAt);

  const sankeyControllerStartedAt = relationPerfNow();
  const sankeyController = createSankeyChartController({
    t,
    isDark,
    isMobile,
    activeView,
    sankeyChartHeight: graphData.sankeyChartHeight,
    sankeyData: graphData.sankeyData,
    sankeyBottom,
    sankeyLabelFontSize,
    sankeyLabelLineHeight,
    sankeyLabelOverflow,
    sankeyLayoutIterations,
    sankeyRight,
    sankeyLabelWidth,
    sankeyLeft,
    sankeyNodeAlign,
    sankeyNodeGap,
    sankeyNodeWidth,
    sankeyTop,
    onSelectNode: selectSankeyNode,
  });
  measureRelationPerf("create sankey controller done", sankeyControllerStartedAt);

  const networkControllerStartedAt = relationPerfNow();
  const networkController = createNetworkChartController({
    t,
    isDark,
    isMobile,
    activeView,
    networkState,
    selectedNetworkNodeId,
    draggedNodePositions: graphData.draggedNodePositions,
    getVisibleNetworkData,
    getGraphColor,
    toContextNode,
    getDownloadFilename: () => `relation-${relType.value}-${relKey.value}.png`,
    interactionsBridge: networkInteractionsBridge,
  });
  measureRelationPerf("create network controller done", networkControllerStartedAt);
  renderNetworkChartBridge.current = networkController.renderNetworkChart;

  const nodeActionsStartedAt = relationPerfNow();
  const nodeActions = useRelationNodeActions({
    t,
    router,
    networkPaneRef: networkController.networkPaneRef,
    dropdown1,
    relKey,
    lines,
    selectedNetworkNode,
    selectedNetworkNodeId,
    RelationTypeMapping,
    findNodeById: graphData.findNodeById,
    buildNodeSummary,
    isDirectRelationLine,
    getRelationSourceFields,
    genNetworkGraphData,
    renderNetworkChart: networkController.renderNetworkChart,
  });
  measureRelationPerf("use relation node actions done", nodeActionsStartedAt);

  const bridgeStartedAt = relationPerfNow();
  networkInteractionsBridge.handleNodeTouch = (node) => nodeActions.handleNodeTouch(node as ReturnType<typeof toContextNode>);
  networkInteractionsBridge.openNodeDetail = (node) =>
    nodeActions.focusNodeInDrawer((node as ReturnType<typeof toContextNode>).id);
  networkInteractionsBridge.nodeClick = (node, event) =>
    nodeActions.nodeClick(node as ReturnType<typeof toContextNode>, event);
  setClearDraggedNodePositions(clearDraggedNodePositions);
  measureRelationPerf("wire interaction bridge done", bridgeStartedAt);

  const effectsStartedAt = relationPerfNow();
  setupRelationViewEffects({
    t,
    route,
    router,
    locale,
    isDark,
    activeView,
    relType,
    relKey,
    getCurrentEntityOptions: graphData.getCurrentEntityOptions,
    RelationTypeMapping,
    addRootNode,
    genNetworkGraphData,
    rebuildGraphData,
    refreshGraphAfterVisible,
    renderNetworkChart: networkController.renderNetworkChart,
    updateNetworkSelection: networkController.updateNetworkSelection,
    renderSankeyChart: sankeyController.renderSankeyChart,
    updateSankeyTheme: sankeyController.updateSankeyTheme,
    resizeNetworkChart: networkController.resizeNetworkChart,
    resizeSankeyChart: sankeyController.resizeSankeyChart,
    hideNetworkTooltip: networkController.hideNetworkTooltip,
    hideSankeyTooltip: sankeyController.hideSankeyTooltip,
    handleGlobalPointerDown: nodeActions.handleGlobalPointerDown,
    disposeNetworkChart: networkController.disposeNetworkChart,
    disposeSankeyChart: sankeyController.disposeSankeyChart,
    filterLineType: graphData.filterLineType,
    selectedNetworkNodeId,
  });
  measureRelationPerf("setup relation view effects done", effectsStartedAt);
  measureRelationPerf("assembly done", assemblyStartedAt);

  const returnStartedAt = relationPerfNow();
  const relationView = {
    ...graphData,
    ...networkController,
    ...nodeActions,
    ...sankeyController,
    activeView,
    dropdown1,
    setDropdownInstance,
    handleNetworkLayoutCommand,
    networkLayoutTooltip,
    networkState,
    refreshNetworkChart,
    relKey,
    relType,
    sankeyChartMinWidth,
    zoomNetworkChart,
  };
  measureRelationPerf("assembly return object prepared", returnStartedAt);
  return relationView;
};
