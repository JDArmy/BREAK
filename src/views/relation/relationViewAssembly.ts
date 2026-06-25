import { createNetworkDataHelpers } from "@/views/relation/relationNetworkLayout";
import {
  createNetworkChartController,
  createSankeyChartController,
} from "@/views/relation/relationViewControllers";
import { setupRelationViewEffects } from "@/views/relation/relationViewEffects";
import { createRelationViewState, type RelationViewMode } from "@/views/relation/relationViewState";
import {
  getDefaultViewByPerspective,
  getRelationAnalysisPerspectiveOption,
  getRelationPerspectiveFromRoute,
  type RelationPerspectiveKey,
} from "@/views/relation/relationAnalysisPerspectives";
import {
  buildPerspectiveQuery,
  ENTITY_ROUTE_BY_PERSPECTIVE,
  PERSPECTIVE_ROUTE_NAME,
  VIEW_TO_PERSPECTIVE,
} from "@/views/relation/relationRouteQuery";
import { useRelationGraphData } from "@/views/relation/useRelationGraphData";
import { useRelationNodeActions } from "@/views/relation/useRelationNodeActions";
import { createRelationPathExplorerSankey } from "@/views/relation/relationPathExplorerSankey";
import {
  buildGlobalNodeAnalysisSummary,
  buildGlobalNodeRelatedEntitySummary,
  buildGlobalNodeRelationCounts,
  buildGlobalNodeRelations,
  getGlobalLines,
} from "@/views/relation/relationGlobalLines";
import {
  RelationType,
  type createRelationTypeMapping,
  getRelationLineKey,
  type GraphLink,
  type graphColors,
  type relationLineColors,
  type SankeyNode,
} from "@/views/relation/relationTypes";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import type { DropdownInstance } from "element-plus";
import { computed, nextTick, ref, watch, type Ref } from "vue";

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
    pathExplorerStartType,
    pathExplorerStartKey,
    pathExplorerEndType,
    pathExplorerEndKey,
    pathExplorerMaxDepth,
    pathExplorerMaxPaths,
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

  // 视角由路由 name 决定（meta.relationPerspective）。
  // 切视角（route.name 变化）→ 推导 activeView/activeAnalysisPerspective 并重置筛选/布局；
  // pathExplorer 切入时复位根节点为起点实体，切出时复位为 selector 根节点。
  watch(
    () => route.name,
    (name) => {
      const perspective = getRelationPerspectiveFromRoute(name);
      if (!perspective) return;
      const nextView = getDefaultViewByPerspective(perspective);
      if (nextView !== activeView.value) activeView.value = nextView;
      if (perspective === "pathExplorer") {
        // pathExplorer 不属于三元分析视角；起点实体跟随当前 selector 根节点
        pathExplorerStartType.value = relType.value;
        pathExplorerStartKey.value = relKey.value;
        selectedNetworkNodeId.value = relKey.value;
      } else {
        if (perspective !== activeAnalysisPerspective.value) {
          activeAnalysisPerspective.value = perspective;
        }
        applyAnalysisPerspective(perspective);
      }
    },
    { immediate: true },
  );

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

  // 路径探索数据（基于全局知识库关系，不依赖当前图谱局部边）
  const pathExplorerData = createRelationPathExplorerSankey({
    startType: pathExplorerStartType,
    startKey: pathExplorerStartKey,
    endType: pathExplorerEndType,
    endKey: pathExplorerEndKey,
    maxDepth: pathExplorerMaxDepth,
    maxPaths: pathExplorerMaxPaths,
    getSankeyNodeName: graphData.getSankeyNodeName,
    isMobile,
    RelationTypeMapping,
    locale,
    selectedNetworkNodeId,
    getNodeTitle: graphData.getNodeTitle,
    getNodeTypeTitle: graphData.getNodeTypeTitle,
    isDirectRelationLine: graphData.isDirectRelationLine,
    getRelationSourceFields: graphData.getRelationSourceFields,
    getRelationLineKey,
    t,
  });

  // 路径探索桑基图：根据跳数动态调整右侧标签宽度
  // 层数多时（5-6跳）缩小右侧标签区，把更多水平空间留给节点分布
  // 路径探索桑基图控制器（独立实例）
  const pathExplorerSankeyController = createSankeyChartController({
    t,
    isDark,
    isMobile,
    activeView,
    sankeyChartHeight: pathExplorerData.pathExplorerChartHeight,
    sankeyData: pathExplorerData.pathExplorerSankeyData,
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
    viewModeKey: "pathExplorer",
  });

  // 路径发现和图表高度变化时触发桑基图渲染：先让 computed 高度更新并落到 DOM，再绘制。
  watch([pathExplorerData.pathExplorerSankeyData, pathExplorerData.pathExplorerChartHeight], () => {
    if (activeView.value === "pathExplorer" && pathExplorerData.pathExplorerHasData.value) {
      nextTick(() => {
        requestAnimationFrame(() => {
          pathExplorerSankeyController.renderSankeyChart();
        });
      });
    }
  });

  // 路径探索参数 ↔ URL query 双向同步
  let isUpdatingFromRoute = false;
  watch([pathExplorerEndType, pathExplorerEndKey, pathExplorerMaxDepth, pathExplorerMaxPaths], ([endType, endKey, maxDepth, maxPaths]) => {
    if (isUpdatingFromRoute) return;
    // 仅在 pathExplorer 视角下写回 URL：
    // 切视角过程中面板可能先挂载并设置默认 endKey，此时 route.name 尚未切到 path-explorer，
    // 若放任写回会用旧 route.name（如 risk-relation）replace，取消正在进行的视角跳转 push。
    if (getRelationPerspectiveFromRoute(route.name) !== "pathExplorer") return;
    const query = { ...route.query };
    let changed = false;
    if (endType && endType !== query.endType) {
      query.endType = endType;
      changed = true;
    }
    if (endKey !== query.endKey) {
      if (endKey) {
        query.endKey = endKey;
      } else {
        delete query.endKey;
      }
      changed = true;
    }
    const maxDepthStr = String(maxDepth);
    if (maxDepthStr !== (query.maxDepth ?? "4")) {
      query.maxDepth = maxDepthStr;
      changed = true;
    }
    const maxPathsStr = String(maxPaths);
    if (maxPathsStr !== (query.maxPaths ?? "10")) {
      query.maxPaths = maxPathsStr;
      changed = true;
    }
    if (changed) {
      const perspective = getRelationPerspectiveFromRoute(route.name) ?? "pathExplorer";
      router.replace({
        name: ENTITY_ROUTE_BY_PERSPECTIVE[perspective],
        params: { entity: relType.value, id: relKey.value },
        query: buildPerspectiveQuery(query, "pathExplorer"),
      });
    }
  });

  watch(
    () => [route.query.endType, route.query.endKey, route.query.maxDepth, route.query.maxPaths],
    ([queryEndType, queryEndKey, queryMaxDepth, queryMaxPaths]) => {
      // 仅 pathExplorer 视角读取这些 query（白名单已隔离，此处再加防御）
      if (getRelationPerspectiveFromRoute(route.name) !== "pathExplorer") return;
      isUpdatingFromRoute = true;
      if (typeof queryEndType === "string" && queryEndType !== pathExplorerEndType.value) {
        const validTypes = Object.values(RelationType) as string[];
        if (validTypes.includes(queryEndType)) {
          pathExplorerEndType.value = queryEndType as RelationType;
        }
      }
      if (typeof queryEndKey === "string" && queryEndKey !== pathExplorerEndKey.value) {
        pathExplorerEndKey.value = queryEndKey;
      }
      // 注意：不在 queryEndKey=undefined 时重置 pathExplorerEndKey——面板 onMounted 可能已设置默认值，
      // 写回尚未完成（路由导航异步），此时重置会导致 hasTarget 闪为 false。
      if (typeof queryMaxDepth === "string") {
        const val = Math.max(1, Math.min(6, parseInt(queryMaxDepth, 10) || 4));
        if (val !== pathExplorerMaxDepth.value) pathExplorerMaxDepth.value = val;
      }
      if (typeof queryMaxPaths === "string") {
        const val = Math.max(1, Math.min(30, parseInt(queryMaxPaths, 10) || 10));
        if (val !== pathExplorerMaxPaths.value) pathExplorerMaxPaths.value = val;
      }
      nextTick(() => { isUpdatingFromRoute = false; });
    },
  );

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
    renderPathExplorerSankeyChart: pathExplorerSankeyController.renderSankeyChart,
    resizePathExplorerSankeyChart: pathExplorerSankeyController.resizeSankeyChart,
    updatePathExplorerSankeyTheme: pathExplorerSankeyController.updateSankeyTheme,
    disposePathExplorerSankeyChart: pathExplorerSankeyController.disposeSankeyChart,
    hidePathExplorerSankeyTooltip: pathExplorerSankeyController.hideSankeyTooltip,
    normalizeAttackPathFilters: graphData.normalizeAttackPathFilters,
    handleGlobalPointerDown: nodeActions.handleGlobalPointerDown,
    disposeNetworkChart: networkController.disposeNetworkChart,
    disposeSankeyChart: sankeyController.disposeSankeyChart,
    selectedNetworkNodeId,
  });

  // 节点详情抽屉「与根节点关系」：路径探索 tab 以起点实体为根，
  // 展示起点→被点击节点的子路径；其余视角沿用图谱根（relKey）的局部 BFS 结果。
  const mergedSelectedNodeRootPath = computed(() =>
    activeView.value === "pathExplorer"
      ? pathExplorerData.pathExplorerNodeRootPath.value
      : graphData.selectedNodeRootPath.value,
  );
  const mergedIsCurrentNodeRoot = computed(() =>
    activeView.value === "pathExplorer"
      ? pathExplorerData.pathExplorerIsCurrentNodeRoot.value
      : graphData.isCurrentNodeRoot.value,
  );

  // 路径探索 tab 下节点详情改用全局 BREAK 关系（仅此 tab 生效）：
  // 节点概览 / 关系列表 / 关系计数 / 相关实体 基于该节点自身的全局关系构建，
  // 不再依赖网络图局部 lines（局部 lines 仅含根节点 1 跳邻域，非邻域节点会显示 0 关系）。
  // 其余视角沿用 graphData 基于局部 lines 的原值。
  const mergedSelectedNodeAnalysisSummary = computed(() => {
    if (activeView.value !== "pathExplorer") {
      return graphData.selectedNodeAnalysisSummary.value;
    }
    const node = graphData.selectedNetworkNode.value;
    return buildGlobalNodeAnalysisSummary({
      node: node ? { id: node.id, type: node.type } : null,
      globalLines: getGlobalLines(),
      getNodeTitle: graphData.getNodeTitle,
      getNodeTypeTitle: graphData.getNodeTypeTitle,
      t,
      selectedNodeRootPath: mergedSelectedNodeRootPath.value,
      selectedNodeDiscoveredPaths: graphData.selectedNodeDiscoveredPaths.value,
    });
  });
  const mergedSelectedNetworkRelations = computed(() => {
    if (activeView.value !== "pathExplorer") {
      return graphData.selectedNetworkRelations.value;
    }
    const node = graphData.selectedNetworkNode.value;
    if (!node) return [];
    return buildGlobalNodeRelations({
      nodeId: node.id,
      globalLines: getGlobalLines(),
      getNodeTitle: graphData.getNodeTitle,
      getNodeTypeTitle: graphData.getNodeTypeTitle,
      isDirectRelationLine: graphData.isDirectRelationLine,
      getRelationSourceFields: graphData.getRelationSourceFields,
      getRelationPriority: graphData.getRelationPriority,
      explainRelation: graphData.explainRelation,
      formatEvidenceLevel: graphData.formatEvidenceLevel,
      t,
    });
  });
  const mergedSelectedNetworkRelationCounts = computed(() => {
    if (activeView.value !== "pathExplorer") {
      return graphData.selectedNetworkRelationCounts.value;
    }
    const node = graphData.selectedNetworkNode.value;
    if (!node) return { incoming: 0, outgoing: 0 };
    return buildGlobalNodeRelationCounts(node.id, getGlobalLines());
  });
  const mergedSelectedNodeRelatedEntitySummary = computed(() => {
    if (activeView.value !== "pathExplorer") {
      return graphData.selectedNodeRelatedEntitySummary.value;
    }
    const node = graphData.selectedNetworkNode.value;
    if (!node) return null;
    return buildGlobalNodeRelatedEntitySummary({
      nodeId: node.id,
      getNodeTitle: graphData.getNodeTitle,
      getNodeTypeTitle: graphData.getNodeTypeTitle,
      t,
    });
  });

  // el-tabs 切视角：push 到目标视角路由，保留当前选中实体（若有），query 按白名单隔离
  const switchPerspective = (view: RelationViewMode) => {
    const perspective: RelationPerspectiveKey = VIEW_TO_PERSPECTIVE[view];
    const hasSelection = Boolean(relKey.value);
    router.push({
      name: hasSelection
        ? ENTITY_ROUTE_BY_PERSPECTIVE[perspective]
        : PERSPECTIVE_ROUTE_NAME[perspective],
      params: hasSelection
        ? { entity: relType.value, id: relKey.value }
        : {},
      query: buildPerspectiveQuery(route.query, perspective),
    });
  };

  const relationView = {
    ...graphData,
    ...networkController,
    ...nodeActions,
    ...sankeyController,
    ...pathExplorerData,
    pathExplorerSankeyController,
    activeAnalysisPerspective,
    activeView,
    closeNetworkRelationDetail,
    dropdown1,
    setDropdownInstance,
    setRelationPageElement,
    switchPerspective,
    handleNetworkLayoutCommand,
    currentAnalysisPerspectiveOption,
    networkLayoutTooltip,
    networkState,
    pathExplorerStartType,
    pathExplorerStartKey,
    pathExplorerEndType,
    pathExplorerEndKey,
    pathExplorerMaxDepth,
    pathExplorerMaxPaths,
    refreshNetworkChart,
    selectedNetworkRelationDetail,
    // 覆盖 graphData 展开的同名键：路径探索 tab 下改用起点实体为根
    selectedNodeRootPath: mergedSelectedNodeRootPath,
    isCurrentNodeRoot: mergedIsCurrentNodeRoot,
    // 覆盖 graphData 展开的同名键：路径探索 tab 下节点详情改用全局 BREAK 关系
    selectedNodeAnalysisSummary: mergedSelectedNodeAnalysisSummary,
    selectedNetworkRelations: mergedSelectedNetworkRelations,
    selectedNetworkRelationCounts: mergedSelectedNetworkRelationCounts,
    selectedNodeRelatedEntitySummary: mergedSelectedNodeRelatedEntitySummary,
    relKey,
    relType,
    sankeyChartMinWidth,
    zoomNetworkChart,
  };
  return relationView;
};
