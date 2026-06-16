import { computed, reactive, ref, type Ref } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import { networkLayoutOptions, networkLayoutZoom, RelationType, type NetworkLayoutMode, type SankeyNode } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;
export type RelationViewMode = "network" | "sankey";
export type SankeyLabelOverflow = "truncate" | "break";
export type SankeyNodeAlign = "justify" | "left" | "right";

export const relationViewModes = ["network", "sankey"] as const;

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
  const relType = ref<RelationType>(route.params.type as RelationType);
  const relKey = ref<string>(route.params.key as string);
  const defaultActiveView = isMobile.value ? "sankey" : "network";
  const activeView = ref<RelationViewMode>(normalizeRelationViewMode(route.query.view, defaultActiveView));

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
  const sankeyLabelFontSize = computed(() => (isMobile.value ? 10 : 12));
  const sankeyLabelLineHeight = computed(() => (isMobile.value ? 14 : 16));
  const sankeyLayoutIterations = computed(() => (isMobile.value ? 0 : 48));
  const sankeyLabelOverflow = computed<SankeyLabelOverflow>(() => "truncate");
  const sankeyNodeAlign = computed<SankeyNodeAlign>(() => (isMobile.value ? "left" : "justify"));

  const sankeyLabelWidth = computed(() => {
    if (isMobile.value) return Math.max(240, Math.min(330, Math.round(sankeyChartMinWidth.value * 0.27)));
    if (width.value < 992) return 160;
    return 220;
  });

  const selectSankeyNode = (node: SankeyNode) => {
    relType.value = node.entityType;
    relKey.value = node.entityKey;
  };

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
  };
};
