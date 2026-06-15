import { computed, reactive, ref, type Ref } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import { networkLayoutOptions, networkLayoutZoom, RelationType, type NetworkLayoutMode, type SankeyNode } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

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
    sankeyLabelWidth,
    sankeyRight,
    setClearDraggedNodePositions,
    selectSankeyNode,
    zoomNetworkChart,
  };
};
