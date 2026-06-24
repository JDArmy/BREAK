import { createNetworkDataHelpers } from "@/views/relation/relationNetworkLayout";
import {
  createNetworkChartController,
  createSankeyChartController,
} from "@/views/relation/relationViewControllers";
import { setupRelationViewEffects } from "@/views/relation/relationViewEffects";
import { createRelationViewState } from "@/views/relation/relationViewState";
import {
  getRelationAnalysisPerspectiveOption,
  normalizeRelationAnalysisPerspective,
  relationAnalysisPerspectiveOptions,
} from "@/views/relation/relationAnalysisPerspectives";
import { useRelationGraphData } from "@/views/relation/useRelationGraphData";
import { useRelationNodeActions } from "@/views/relation/useRelationNodeActions";
import {
  type createRelationTypeMapping,
  type GraphLink,
  type graphColors,
  type relationLineColors,
  type SankeyNode,
} from "@/views/relation/relationTypes";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import type { DropdownInstance } from "element-plus";
import { computed, ref, watch, type Ref } from "vue";

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
    activeAnalysisPerspective,
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
    filterRelatedEntity: graphData.filterRelatedEntity,
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

  const currentAnalysisPerspectiveOption = computed(() =>
    getRelationAnalysisPerspectiveOption(activeAnalysisPerspective.value)
  );

  const applyAnalysisPerspective = (
    perspective = activeAnalysisPerspective.value,
    options: { applyDefaultView?: boolean } = {},
  ) => {
    const perspectiveOption = getRelationAnalysisPerspectiveOption(perspective);
    graphData.filterRelationType.value = [...perspectiveOption.relationTypes];
    graphData.filterSubNode.value = perspectiveOption.showSubNode;
    graphData.filterRelatedEntity.value = perspectiveOption.showRelatedEntity;

    const availableLineTypes = new Set(
      graphData.relationLegendItems.value.map((item) => item.key),
    );
    graphData.filterLineType.value = perspectiveOption.lineTypes.filter(
      (lineType) => availableLineTypes.has(lineType),
    );

    if (networkState.layout !== perspectiveOption.networkLayout) {
      handleNetworkLayoutCommand(perspectiveOption.networkLayout);
    }

    if (options.applyDefaultView ?? true) {
      activeView.value = perspectiveOption.defaultView;
    }

    nodeActions.doFilter();
  };

  watch(activeAnalysisPerspective, (perspective) => {
    if (route.query.perspective !== perspective) {
      router.replace({
        name: "relation",
        params: {
          type: relType.value,
          key: relKey.value,
        },
        query: {
          ...route.query,
          perspective,
        },
      });
    }
    applyAnalysisPerspective(perspective);
  });

  watch(
    () => route.query.perspective,
    (perspective) => {
      const normalizedPerspective = normalizeRelationAnalysisPerspective(
        perspective,
        activeAnalysisPerspective.value,
      );
      if (normalizedPerspective !== activeAnalysisPerspective.value) {
        activeAnalysisPerspective.value = normalizedPerspective;
      }
    },
  );

  if (typeof route.query.perspective === "string") {
    applyAnalysisPerspective(activeAnalysisPerspective.value, {
      applyDefaultView: route.query.view === undefined,
    });
  }

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
    activeAnalysisPerspective,
    activeView,
    closeNetworkRelationDetail,
    dropdown1,
    setDropdownInstance,
    setRelationPageElement,
    handleNetworkLayoutCommand,
    currentAnalysisPerspectiveOption,
    networkLayoutTooltip,
    networkState,
    relationAnalysisPerspectiveOptions,
    refreshNetworkChart,
    selectedNetworkRelationDetail,
    relKey,
    relType,
    sankeyChartMinWidth,
    zoomNetworkChart,
  };
  return relationView;
};
