import { createNetworkDataHelpers } from "@/views/relation/relationNetworkLayout";
import {
  createNetworkChartController,
  createSankeyChartController,
} from "@/views/relation/relationViewControllers";
import { setupRelationViewEffects } from "@/views/relation/relationViewEffects";
import { createRelationViewState } from "@/views/relation/relationViewState";
import { useRelationGraphData } from "@/views/relation/useRelationGraphData";
import { useRelationNodeActions } from "@/views/relation/useRelationNodeActions";
import type {
  createRelationTypeMapping,
  GraphLink,
  graphColors,
  relationLineColors,
  SankeyNode,
} from "@/views/relation/relationTypes";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import type { DropdownInstance } from "element-plus";
import { ref, type Ref } from "vue";

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
    openNodeDetail: (node: unknown) => void;
    openRelationDetail: (link: unknown) => void;
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
  const relationPageRef = ref<HTMLDivElement>();
  const setRelationPageElement = (element: unknown) => {
    relationPageRef.value =
      element instanceof HTMLDivElement ? element : undefined;
  };

  const viewState = createRelationViewState({
    route,
    t,
    isMobile,
    width,
    renderNetworkChartBridge,
  });

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
    zoomNetworkChart,
  } = viewState;

  const graphData = useRelationGraphData({
    t,
    locale,
    isDark,
    isMobile,
    relType,
    relKey,
    RelationTypeMapping,
    getGraphColor,
    getRelationLineColor,
    renderNetworkChart: (notMerge) =>
      renderNetworkChartBridge.current(notMerge),
  });

  const {
    addRootNode,
    clearDraggedNodePositions,
    buildNodeSummary,
    ensureRelationNode,
    genNetworkGraphData,
    isDirectRelationLine,
    rebuildGraphData,
    refreshGraphAfterVisible,
    getRelationSourceFields,
    lines,
    selectedNetworkNode,
    selectedNetworkNodeId,
  } = graphData;

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
    explainRelation: graphData.explainRelation,
    formatEvidenceLevel: graphData.formatEvidenceLevel,
    getNodeTypeTitle: graphData.getNodeTypeTitle,
  });

  const nodeActions = useRelationNodeActions({
    t,
    router,
    contextMenuPaneRef: relationPageRef,
    dropdown1,
    relKey,
    relType,
    lines,
    selectedNetworkNode,
    selectedNetworkNodeId,
    RelationTypeMapping,
    ensureRelationNode,
    findNodeById: graphData.findNodeById,
    buildNodeSummary,
    isDirectRelationLine,
    getRelationSourceFields,
    explainRelation: graphData.explainRelation,
    formatEvidenceLevel: graphData.formatEvidenceLevel,
    genNetworkGraphData,
    renderNetworkChart: (notMerge) =>
      renderNetworkChartBridge.current(notMerge),
  });

  const openSankeyNodeActions = (node: SankeyNode, event?: MouseEvent) => {
    const contextNode = nodeActions.prepareNodeActions(
      node.entityType,
      node.entityKey
    );
    if (event) {
      nodeActions.nodeClick(contextNode, event);
    } else {
      nodeActions.handleNodeTouch(contextNode);
    }
  };

  const openSankeyNodeDetail = (node: SankeyNode) => {
    nodeActions.prepareNodeActions(node.entityType, node.entityKey);
    nodeActions.focusNodeInDrawer(node.entityKey);
  };

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
    onOpenNodeDetail: openSankeyNodeDetail,
    onOpenNodeActions: openSankeyNodeActions,
  });

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
  renderNetworkChartBridge.current = networkController.renderNetworkChart;

  const selectedNetworkRelationDetail = ref<GraphLink | null>(null);
  const closeNetworkRelationDetail = () => {
    selectedNetworkRelationDetail.value = null;
  };

  networkInteractionsBridge.handleNodeTouch = (node) =>
    nodeActions.handleNodeTouch(node as ReturnType<typeof toContextNode>);
  networkInteractionsBridge.openNodeDetail = (node) =>
    nodeActions.focusNodeInDrawer(
      (node as ReturnType<typeof toContextNode>).id
    );
  networkInteractionsBridge.openRelationDetail = (link) => {
    selectedNetworkRelationDetail.value = link as GraphLink;
  };
  networkInteractionsBridge.nodeClick = (node, event) =>
    nodeActions.nodeClick(node as ReturnType<typeof toContextNode>, event);
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
    getCurrentEntityOptions: graphData.getCurrentEntityOptions,
    RelationTypeMapping,
    addRootNode,
    genNetworkGraphData,
    rebuildGraphData,
    refreshGraphAfterVisible,
    renderNetworkChart: networkController.renderNetworkChart,
    recreateNetworkChart: networkController.recreateNetworkChart,
    updateNetworkSelection: networkController.updateNetworkSelection,
    renderSankeyChart: sankeyController.renderSankeyChart,
    updateSankeyTheme: sankeyController.updateSankeyTheme,
    resizeNetworkChart: networkController.resizeNetworkChart,
    resizeSankeyChart: sankeyController.resizeSankeyChart,
    hideNetworkTooltip: networkController.hideNetworkTooltip,
    hideSankeyTooltip: sankeyController.hideSankeyTooltip,
    normalizeAttackPathFilters: graphData.normalizeAttackPathFilters,
    handleGlobalPointerDown: nodeActions.handleGlobalPointerDown,
    disposeNetworkChart: networkController.disposeNetworkChart,
    disposeSankeyChart: sankeyController.disposeSankeyChart,
    selectedNetworkNodeId,
  });

  const relationView = {
    ...graphData,
    ...networkController,
    ...nodeActions,
    ...sankeyController,
    activeView,
    closeNetworkRelationDetail,
    dropdown1,
    setDropdownInstance,
    setRelationPageElement,
    handleNetworkLayoutCommand,
    networkLayoutTooltip,
    networkState,
    refreshNetworkChart,
    selectedNetworkRelationDetail,
    relKey,
    relType,
    sankeyChartMinWidth,
    zoomNetworkChart,
  };
  return relationView;
};
