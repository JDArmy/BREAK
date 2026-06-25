import { computed, reactive, ref, type Ref } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import {
  getDefaultViewByPerspective,
  getRelationPerspectiveFromRoute,
  type RelationAnalysisPerspective,
} from "@/views/relation/relationAnalysisPerspectives";
import { networkLayoutOptions, networkLayoutZoom, RelationType, type NetworkLayoutMode, type SankeyNode } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;
export type RelationViewMode = "network" | "sankey" | "analysis" | "pathExplorer";
export type SankeyLabelOverflow = "truncate" | "break";
export type SankeyNodeAlign = "justify" | "left" | "right";

export const relationViewModes = ["network", "sankey", "analysis", "pathExplorer"] as const;

export const normalizeRelationViewMode = (view: unknown, fallback: RelationViewMode): RelationViewMode =>
  typeof view === "string" && relationViewModes.includes(view as RelationViewMode)
    ? (view as RelationViewMode)
    : fallback;

interface CreateRelationViewStateOptions {
  route: RouteLocationNormalizedLoaded;
  t: Translate;
  isMobile: Ref<boolean>;
  width: Ref<number>;
  renderNetworkChartBridge: { current: (notMerge?: boolean) => void };
}

export const createRelationViewState = ({
  route,
  t,
  isMobile,
  width,
  renderNetworkChartBridge,
}: CreateRelationViewStateOptions) => {
  let clearDraggedNodePositions = () => {};
  // relType/relKey 来自路由 entity/id 段（带实体子路由有值；视角首页无值则用默认 risk/R0001）
  const routePerspective = getRelationPerspectiveFromRoute(route.name) ?? "risk";
  const relType = ref<RelationType>(
    (route.params.entity as RelationType) || RelationType.risk,
  );
  const relKey = ref<string>((route.params.id as string) || "R0001");
  // activeView 由视角推导（取代 query.view）；移动端仅 risk 视角默认 sankey，其它视角尊重视角默认 view
  const perspectiveDefaultView = getDefaultViewByPerspective(routePerspective);
  const defaultActiveView =
    isMobile.value && routePerspective === "risk" ? "sankey" : perspectiveDefaultView;
  const activeView = ref<RelationViewMode>(defaultActiveView);
  // activeAnalysisPerspective 由视角推导（pathExplorer 不属于三元分析视角，兜底 risk）
  const activeAnalysisPerspective = ref<RelationAnalysisPerspective>(
    routePerspective === "pathExplorer" ? "risk" : routePerspective,
  );

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

  const sankeyChartMinWidth = computed(() => {
    if (!isMobile.value) return 0;
    return Math.max(980, Math.round(width.value * 2.6));
  });

  const sankeyRight = computed(() => {
    if (isMobile.value) return Math.max(250, Math.min(340, Math.round(sankeyChartMinWidth.value * 0.28)));
    if (width.value < 992) return 160;
    return 280;
  });

  const sankeyLeft = computed(() => (isMobile.value ? 14 : 40));
  const sankeyTop = computed(() => (isMobile.value ? 12 : 24));
  const sankeyBottom = computed(() => (isMobile.value ? 14 : 24));
  const sankeyNodeWidth = computed(() => (isMobile.value ? 10 : 18));
  const sankeyNodeGap = computed(() => (isMobile.value ? 12 : 10));
  const sankeyLabelFontSize = computed(() => (isMobile.value ? 12 : 13));
  const sankeyLabelLineHeight = computed(() => (isMobile.value ? 16 : 17));
  const sankeyLayoutIterations = computed(() => (isMobile.value ? 0 : 48));
  const sankeyLabelOverflow = computed<SankeyLabelOverflow>(() => "truncate");
  const sankeyNodeAlign = computed<SankeyNodeAlign>(() => (isMobile.value ? "left" : "justify"));

  const sankeyLabelWidth = computed(() => {
    if (isMobile.value) return Math.max(280, Math.min(360, Math.round(sankeyChartMinWidth.value * 0.3)));
    if (width.value < 992) return 160;
    return 220;
  });

  const selectSankeyNode = (node: SankeyNode) => {
    relType.value = node.entityType;
    relKey.value = node.entityKey;
  };

  // 路径探索器状态（终点类型/实体从 URL query 初始化）
  const pathExplorerStartType = ref<RelationType>(relType.value);
  const pathExplorerStartKey = ref(relKey.value);
  const pathExplorerEndType = ref<RelationType>(
    (typeof route.query.endType === "string" && Object.values(RelationType).includes(route.query.endType as RelationType))
      ? route.query.endType as RelationType
      : RelationType.avoidance
  );
  const pathExplorerEndKey = ref(typeof route.query.endKey === "string" ? route.query.endKey : "");
  const pathExplorerMaxDepth = ref(
    typeof route.query.maxDepth === "string" ? Math.max(1, Math.min(6, parseInt(route.query.maxDepth, 10) || 4)) : 4
  );
  const pathExplorerMaxPaths = ref(
    typeof route.query.maxPaths === "string" ? Math.max(1, Math.min(30, parseInt(route.query.maxPaths, 10) || 10)) : 10
  );

  const zoomNetworkChart = (step: number) => {
    networkState.zoom = Math.min(3, Math.max(0.12, networkState.zoom + step));
    renderNetworkChartBridge.current(true);
  };

  const changeNetworkLayout = (layout: NetworkLayoutMode) => {
    networkState.layout = layout;
    networkState.zoom = networkLayoutZoom[layout];
    clearDraggedNodePositions();
    renderNetworkChartBridge.current(true);
  };

  const handleNetworkLayoutCommand = (command: string | number | object) => {
    const layout = command as NetworkLayoutMode;
    if (networkLayoutOptions.some((option) => option.value === layout)) {
      changeNetworkLayout(layout);
    }
  };

  const refreshNetworkChart = () => {
    renderNetworkChartBridge.current(true);
  };

  const setClearDraggedNodePositions = (handler: () => void) => {
    clearDraggedNodePositions = handler;
  };

  return {
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
    selectSankeyNode,
    pathExplorerStartType,
    pathExplorerStartKey,
    pathExplorerEndType,
    pathExplorerEndKey,
    pathExplorerMaxDepth,
    pathExplorerMaxPaths,
    zoomNetworkChart,
  };
};
