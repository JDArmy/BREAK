import { ref, type Ref } from "vue";
import { init, type ECharts, type EChartsOption } from "echarts/core";
import type { GraphLink, GraphNode, NetworkLayoutMode } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateNetworkChartControllerOptions {
  t: Translate;
  isDark: Ref<boolean>;
  isMobile: Ref<boolean>;
  activeView: Ref<"network" | "sankey">;
  networkState: { zoom: number; layout: NetworkLayoutMode };
  selectedNetworkNodeId: Ref<string>;
  draggedNodePositions: Ref<Record<string, { x: number; y: number }>>;
  getVisibleNetworkData: () => { nodes: GraphNode[]; links: GraphLink[] };
  getGraphColor: (key: "background" | "line" | "lineText" | "nodeText") => string;
  toContextNode: (node: GraphNode) => unknown;
  getDownloadFilename: () => string;
  interactionsBridge: {
    handleNodeTouch: (node: unknown) => void;
    nodeClick: (node: unknown, event: MouseEvent) => void;
  };
}

export const createNetworkChartController = ({
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
  getDownloadFilename,
  interactionsBridge,
}: CreateNetworkChartControllerOptions) => {
  const networkChartRef = ref<HTMLDivElement>();
  const networkPaneRef = ref<HTMLDivElement>();
  const networkScrollerRef = ref<HTMLDivElement>();
  let networkChart: ECharts | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  let longPressNode: GraphNode | undefined;
  let longPressStart: { x: number; y: number } | undefined;

  const clearLongPressTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = undefined;
    }
    longPressNode = undefined;
    longPressStart = undefined;
  };

  const setNetworkChartElement = (element: HTMLDivElement | undefined) => {
    networkChartRef.value = element;
  };

  const setNetworkPaneElement = (element: HTMLDivElement | undefined) => {
    networkPaneRef.value = element;
  };

  const setNetworkScrollerElement = (element: HTMLDivElement | undefined) => {
    networkScrollerRef.value = element;
  };

  const centerSelectedNodeInScroller = (networkData = getVisibleNetworkData()) => {
    const scroller = networkScrollerRef.value;
    const chartElement = networkChartRef.value;
    if (!isMobile.value || activeView.value !== "network" || !scroller || !chartElement) return;
    if (scroller.clientWidth === 0 || scroller.clientHeight === 0) return;

    const nodesWithPosition = networkData.nodes.filter(
      (node): node is GraphNode & { x: number; y: number } => typeof node.x === "number" && typeof node.y === "number"
    );
    const selectedNode = nodesWithPosition.find((node) => node.id === selectedNetworkNodeId.value);
    if (!selectedNode || nodesWithPosition.length === 0) return;

    const padding = 180;
    const minX = Math.min(...nodesWithPosition.map((node) => node.x)) - padding;
    const maxX = Math.max(...nodesWithPosition.map((node) => node.x)) + padding;
    const minY = Math.min(...nodesWithPosition.map((node) => node.y)) - padding;
    const maxY = Math.max(...nodesWithPosition.map((node) => node.y)) + padding;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const nodePixelX = ((selectedNode.x - minX) / spanX) * chartElement.clientWidth;
    const nodePixelY = ((selectedNode.y - minY) / spanY) * chartElement.clientHeight;

    scroller.scrollLeft = Math.max(0, nodePixelX - scroller.clientWidth / 2);
    scroller.scrollTop = Math.max(0, nodePixelY - scroller.clientHeight / 2);
  };

  const bindNetworkChartEvents = () => {
    if (!networkChart) return;
    networkChart.off("click");
    networkChart.off("dblclick");
    networkChart.off("contextmenu");
    networkChart.off("mousedown");
    networkChart.off("mouseup");
    networkChart.off("dragend");
    networkChart.getZr().off("pointermove");
    networkChart.getZr().off("pointerup");
    networkChart.getZr().off("pointercancel");
    networkChart.getZr().off("globalout");
    const persistDraggedNodePosition = (params: { dataType?: string; dataIndex?: number; data?: GraphNode }) => {
      if (params.dataType !== "node") return;
      const option = networkChart?.getOption();
      const seriesData =
        option?.series?.[0] && "data" in option.series[0]
          ? (option.series[0].data as Array<Partial<GraphNode>>)
          : [];
      const draggedData = typeof params.dataIndex === "number" ? seriesData[params.dataIndex] : undefined;
      const data = (draggedData ?? params.data) as Partial<GraphNode>;
      if (typeof data.id !== "string" || typeof data.x !== "number" || typeof data.y !== "number") return;
      draggedNodePositions.value = {
        ...draggedNodePositions.value,
        [data.id]: { x: data.x, y: data.y },
      };
    };
    networkChart.on("click", (params) => {
      if (params.dataType !== "node") return;
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
    });
    networkChart.on("dblclick", (params) => {
      if (params.dataType !== "node" || !params.event?.event) return;
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
      interactionsBridge.nodeClick(toContextNode(params.data as GraphNode), params.event.event as MouseEvent);
    });
    networkChart.on("contextmenu", (params) => {
      if (params.dataType !== "node" || !params.event?.event) return;
      params.event.event.preventDefault();
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
      interactionsBridge.nodeClick(toContextNode(params.data as GraphNode), params.event.event as MouseEvent);
    });
    networkChart.on("mouseup", (params) => {
      clearLongPressTimer();
      persistDraggedNodePosition(params);
    });
    networkChart.on("dragend", (params) => {
      clearLongPressTimer();
      persistDraggedNodePosition(params);
    });
    networkChart.on("mousedown", (params) => {
      if (!isMobile.value || params.dataType !== "node") return;
      const chartEvent = params.event as { offsetX?: number; offsetY?: number; event?: MouseEvent | PointerEvent };
      const nativeEvent = chartEvent.event;
      const startX = chartEvent.offsetX ?? nativeEvent?.clientX ?? 0;
      const startY = chartEvent.offsetY ?? nativeEvent?.clientY ?? 0;
      clearLongPressTimer();
      longPressNode = params.data as GraphNode;
      longPressStart = { x: startX, y: startY };
      longPressTimer = setTimeout(() => {
        if (!longPressNode) return;
        selectedNetworkNodeId.value = longPressNode.id;
        interactionsBridge.handleNodeTouch(toContextNode(longPressNode));
        clearLongPressTimer();
      }, 550);
    });
    networkChart.getZr().on("pointermove", (event) => {
      if (!longPressStart) return;
      if (Math.hypot(event.offsetX - longPressStart.x, event.offsetY - longPressStart.y) > 10) {
        clearLongPressTimer();
      }
    });
    networkChart.getZr().on("pointerup", clearLongPressTimer);
    networkChart.getZr().on("pointercancel", clearLongPressTimer);
    networkChart.getZr().on("globalout", clearLongPressTimer);
  };

  const clearNetworkNodeHighlight = () => {
    if (!networkChart) return;
    networkChart.dispatchAction({ type: "downplay", seriesIndex: 0 });
  };

  const updateNetworkSelection = () => {
    if (!networkChart || activeView.value !== "network") return;
    const networkData = getVisibleNetworkData();
    networkChart.setOption(
      {
        series: [
          {
            type: "graph",
            data: networkData.nodes,
          },
        ],
      },
      { notMerge: false, lazyUpdate: false }
    );
    clearNetworkNodeHighlight();
  };

  const renderNetworkChart = (notMerge = false) => {
    if (activeView.value !== "network" || !networkChartRef.value) return;
    if (!networkChart) {
      networkChart = init(networkChartRef.value);
      bindNetworkChartEvents();
    }

    const networkData = getVisibleNetworkData();
    const isForceLayout = networkState.layout === "force";
    const style = getComputedStyle(document.documentElement);
    const tooltipBackground = style.getPropertyValue("--break-tooltip-bg").trim();
    const tooltipBorder = style.getPropertyValue("--break-tooltip-border").trim();
    const tooltipText = style.getPropertyValue("--break-tooltip-text").trim();
    const option = {
      backgroundColor: getGraphColor("background"),
      animationDurationUpdate: 300,
      tooltip: {
        trigger: "item",
        backgroundColor: tooltipBackground,
        borderColor: tooltipBorder,
        borderWidth: 1,
        textStyle: {
          color: tooltipText,
        },
        formatter: (params: { dataType?: string; data?: GraphNode | GraphLink }) => {
          if (params.dataType === "node") {
            return (params.data as GraphNode).text.replace(/\n/g, "<br>");
          }
          if (params.dataType === "edge") {
            const link = params.data as GraphLink;
            const fields = link.sourceFields.length
              ? `<br>${t("relationView.sourceFields")}: ${link.sourceFields.join(", ")}`
              : "";
            return `${link.text}${fields}`;
          }
          return "";
        },
      },
      series: [
        {
          type: "graph",
          layout: isForceLayout ? "force" : "none",
          data: networkData.nodes,
          links: networkData.links,
          center: ["52%", "50%"],
          roam: true,
          draggable: true,
          force: isForceLayout
            ? {
                repulsion: 1240,
                edgeLength: [260, 440],
                gravity: 0.022,
                friction: 0.22,
                preventOverlap: 44,
                layoutAnimation: true,
              }
            : undefined,
          label: {
            show: true,
            color: getGraphColor("nodeText"),
            fontSize: 8,
            lineHeight: 10,
            width: 48,
            overflow: "break",
            formatter: (params: { data?: GraphNode }) => params.data?.labelText ?? "",
            rich: {},
          },
          lineStyle: {
            color: getGraphColor("line"),
            opacity: isDark.value ? 0.42 : 0.52,
            curveness: 0.18,
          },
          edgeLabel: {
            show: false,
            color: getGraphColor("lineText"),
            fontSize: 12,
            formatter: (params: { data?: GraphLink }) => params.data?.text ?? "",
          },
          emphasis: {
            focus: "adjacency",
            lineStyle: {
              width: 2,
            },
          },
          blur: {
            itemStyle: {
              opacity: isDark.value ? 0.12 : 0.15,
            },
            label: {
              opacity: isDark.value ? 0.20 : 0.24,
            },
            lineStyle: {
              opacity: isDark.value ? 0.06 : 0.08,
            },
          },
          zoom: networkState.zoom,
          scaleLimit: {
            min: 0.2,
            max: 3,
          },
          animation: isForceLayout,
        },
      ],
    } satisfies EChartsOption;

    networkChart.setOption(option, { notMerge, lazyUpdate: false });
    clearNetworkNodeHighlight();
    networkChart.resize();
    requestAnimationFrame(() => centerSelectedNodeInScroller(networkData));
  };

  const disposeNetworkChart = () => {
    clearLongPressTimer();
    networkChart?.dispose();
    networkChart = null;
  };

  const resizeNetworkChart = () => {
    networkChart?.resize();
  };

  const downloadNetworkChart = () => {
    if (!networkChart) return;
    const imageUrl = networkChart.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: getGraphColor("background"),
    });
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = getDownloadFilename();
    link.click();
  };

  const enterFullscreen = async () => {
    const pane = networkPaneRef.value;
    if (!pane) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await pane.requestFullscreen();
    }
  };

  return {
    disposeNetworkChart,
    downloadNetworkChart,
    enterFullscreen,
    networkChartRef,
    networkPaneRef,
    renderNetworkChart,
    setNetworkChartElement,
    setNetworkPaneElement,
    setNetworkScrollerElement,
    updateNetworkSelection,
    resizeNetworkChart,
  };
};
