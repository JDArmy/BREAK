import { ref, type Ref } from "vue";
import type { ECharts, EChartsOption } from "echarts/core";
import type {
  GraphLink,
  GraphNode,
  NetworkLayoutMode,
} from "@/views/relation/relationTypes";
import { loadNetworkECharts } from "@/views/relation/relationECharts";

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
  getGraphColor: (
    key: "background" | "line" | "lineText" | "nodeText"
  ) => string;
  toContextNode: (node: GraphNode) => unknown;
  getDownloadFilename: () => string;
  interactionsBridge: {
    handleNodeTouch: (node: unknown) => void;
    openNodeDetail: (node: unknown) => void;
    openRelationDetail: (link: GraphLink) => void;
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
  let renderRequestId = 0;
  let bodyOverflowBeforeAppFullscreen: string | null = null;

  const escapeTooltipHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const preventMobileNativeContextMenu = (event: Event) => {
    if (!isMobile.value) return;
    event.preventDefault();
  };

  const removeNativeContextMenuHandler = (element?: HTMLDivElement) => {
    element?.removeEventListener("contextmenu", preventMobileNativeContextMenu);
  };

  const clearLongPressTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = undefined;
    }
    longPressNode = undefined;
    longPressStart = undefined;
  };

  const hideNetworkTooltip = () => {
    networkChart?.dispatchAction({ type: "hideTip" });
  };

  const setNetworkChartElement = (element: HTMLDivElement | undefined) => {
    removeNativeContextMenuHandler(networkChartRef.value);
    networkChartRef.value = element;
    element?.addEventListener("contextmenu", preventMobileNativeContextMenu);
  };

  const setNetworkPaneElement = (element: HTMLDivElement | undefined) => {
    networkPaneRef.value = element;
  };

  const setNetworkScrollerElement = (element: HTMLDivElement | undefined) => {
    networkScrollerRef.value = element;
  };

  const centerSelectedNodeInScroller = (
    networkData = getVisibleNetworkData()
  ) => {
    const scroller = networkScrollerRef.value;
    const chartElement = networkChartRef.value;
    if (
      !isMobile.value ||
      activeView.value !== "network" ||
      !scroller ||
      !chartElement
    )
      return;
    if (scroller.clientWidth === 0 || scroller.clientHeight === 0) return;

    const nodesWithPosition = networkData.nodes.filter(
      (node): node is GraphNode & { x: number; y: number } =>
        typeof node.x === "number" && typeof node.y === "number"
    );
    const selectedNode = nodesWithPosition.find(
      (node) => node.id === selectedNetworkNodeId.value
    );
    if (!selectedNode || nodesWithPosition.length === 0) return;

    const padding = 180;
    const minX = Math.min(...nodesWithPosition.map((node) => node.x)) - padding;
    const maxX = Math.max(...nodesWithPosition.map((node) => node.x)) + padding;
    const minY = Math.min(...nodesWithPosition.map((node) => node.y)) - padding;
    const maxY = Math.max(...nodesWithPosition.map((node) => node.y)) + padding;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const nodePixelX =
      ((selectedNode.x - minX) / spanX) * chartElement.clientWidth;
    const nodePixelY =
      ((selectedNode.y - minY) / spanY) * chartElement.clientHeight;

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
    const persistDraggedNodePosition = (params: {
      dataType?: string;
      dataIndex?: number;
      data?: GraphNode;
    }) => {
      if (params.dataType !== "node") return;
      const option = networkChart?.getOption();
      const seriesData =
        option?.series?.[0] && "data" in option.series[0]
          ? (option.series[0].data as Array<Partial<GraphNode>>)
          : [];
      const draggedData =
        typeof params.dataIndex === "number"
          ? seriesData[params.dataIndex]
          : undefined;
      const data = (draggedData ?? params.data) as Partial<GraphNode>;
      if (
        typeof data.id !== "string" ||
        typeof data.x !== "number" ||
        typeof data.y !== "number"
      )
        return;
      draggedNodePositions.value = {
        ...draggedNodePositions.value,
        [data.id]: { x: data.x, y: data.y },
      };
    };
    networkChart.on("click", (params) => {
      if (params.dataType === "node") {
        selectedNetworkNodeId.value = (params.data as GraphNode).id;
        return;
      }
      if (params.dataType === "edge") {
        interactionsBridge.openRelationDetail(params.data as GraphLink);
      }
    });
    networkChart.on("dblclick", (params) => {
      if (params.dataType !== "node") return;
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
      interactionsBridge.openNodeDetail(
        toContextNode(params.data as GraphNode)
      );
    });
    networkChart.on("contextmenu", (params) => {
      if (params.dataType !== "node" || !params.event?.event) return;
      params.event.event.preventDefault();
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
      interactionsBridge.nodeClick(
        toContextNode(params.data as GraphNode),
        params.event.event as MouseEvent
      );
    });
    networkChart.on("mouseup", (params) => {
      clearLongPressTimer();
      if (isMobile.value) return;
      persistDraggedNodePosition(params);
    });
    networkChart.on("dragend", (params) => {
      clearLongPressTimer();
      if (isMobile.value) return;
      persistDraggedNodePosition(params);
    });
    networkChart.on("mousedown", (params) => {
      if (!isMobile.value || params.dataType !== "node") return;
      const chartEvent = params.event as {
        offsetX?: number;
        offsetY?: number;
        event?: MouseEvent | PointerEvent;
      };
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
      }, 800);
    });
    networkChart.getZr().on("pointermove", (event) => {
      if (!longPressStart) return;
      if (
        Math.hypot(
          event.offsetX - longPressStart.x,
          event.offsetY - longPressStart.y
        ) > 10
      ) {
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
    const requestId = ++renderRequestId;

    const applyNetworkOption = async () => {
      if (
        !networkChartRef.value ||
        activeView.value !== "network" ||
        requestId !== renderRequestId
      )
        return;

      if (!networkChart) {
        const init = await loadNetworkECharts();
        if (
          !networkChartRef.value ||
          activeView.value !== "network" ||
          requestId !== renderRequestId
        )
          return;
        networkChart = init(networkChartRef.value);
        networkChart
          .getDom()
          .addEventListener("contextmenu", preventMobileNativeContextMenu);
        bindNetworkChartEvents();
      }
      hideNetworkTooltip();

      const networkData = getVisibleNetworkData();
      const isForceLayout = networkState.layout === "force";
      const style = getComputedStyle(document.documentElement);
      const tooltipBackground = style
        .getPropertyValue("--break-tooltip-bg")
        .trim();
      const tooltipBorder = style
        .getPropertyValue("--break-tooltip-border")
        .trim();
      const tooltipText = style.getPropertyValue("--break-tooltip-text").trim();
      const option = {
        backgroundColor: getGraphColor("background"),
        animationDurationUpdate: 300,
        tooltip: {
          trigger: "item",
          enterable: false,
          showDelay: 500,
          extraCssText: "z-index: 650 !important;",
          backgroundColor: tooltipBackground,
          borderColor: tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: tooltipText,
          },
          formatter: (params: {
            dataType?: string;
            data?: GraphNode | GraphLink;
          }) => {
            if (params.dataType === "node") {
              return (params.data as GraphNode).text.replace(/\n/g, "<br>");
            }
            if (params.dataType === "edge") {
              const link = params.data as GraphLink;
              const tooltip = {
                wrap: "min-width:280px;max-width:520px;font-size:12px;line-height:1.55;",
                title:
                  "font-size:14px;font-weight:700;margin-bottom:8px;color:inherit;",
                path: "display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;",
                chip: "display:inline-flex;align-items:center;max-width:100%;padding:2px 7px;border:1px solid rgba(148,163,184,.32);border-radius:999px;background:rgba(148,163,184,.10);font-weight:700;overflow-wrap:anywhere;",
                arrow: "opacity:.65;",
                evidence:
                  "display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:2px 7px;border-radius:999px;background:rgba(59,130,246,.14);color:inherit;font-weight:700;margin-bottom:8px;",
                text: "margin-bottom:8px;color:inherit;opacity:.92;",
                muted:
                  "padding-top:7px;border-top:1px solid rgba(148,163,184,.26);color:inherit;opacity:.72;overflow-wrap:anywhere;",
              };
              const fields = link.sourceFields.length
                ? `<div style="${tooltip.muted}">${escapeTooltipHtml(t("relationView.sourceFields"))}: ${escapeTooltipHtml(link.sourceFields.join(", "))}</div>`
                : "";
              const flags = link.explanation.qualityFlags.length
                ? `<div style="${tooltip.muted}">${escapeTooltipHtml(link.explanation.qualityFlags.join(", "))}</div>`
                : "";
              return [
                `<div style="${tooltip.wrap}">`,
                `<div style="${tooltip.title}">${escapeTooltipHtml(link.text)}</div>`,
                `<div style="${tooltip.path}">`,
                `<span style="${tooltip.chip}">${escapeTooltipHtml(link.sourceDisplay)}</span>`,
                `<span style="${tooltip.arrow}">→</span>`,
                `<span style="${tooltip.chip}">${escapeTooltipHtml(link.targetDisplay)}</span>`,
                `</div>`,
                `<div style="${tooltip.evidence}">${escapeTooltipHtml(t("relationView.evidence"))}: ${escapeTooltipHtml(link.evidenceLabel)}</div>`,
                `<div style="${tooltip.text}">${escapeTooltipHtml(link.explanation.explanation)}</div>`,
                fields,
                flags,
                `</div>`,
              ].join("");
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
            draggable: !isMobile.value,
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
              formatter: (params: { data?: GraphNode }) =>
                params.data?.labelText ?? "",
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
              formatter: (params: { data?: GraphLink }) =>
                params.data?.text ?? "",
            },
            emphasis: {
              focus: isMobile.value ? "none" : "adjacency",
              lineStyle: {
                width: 2,
              },
            },
            blur: isMobile.value
              ? undefined
              : {
                  itemStyle: {
                    opacity: isDark.value ? 0.12 : 0.15,
                  },
                  label: {
                    opacity: isDark.value ? 0.2 : 0.24,
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
      if (isMobile.value) {
        requestAnimationFrame(() => {
          if (requestId !== renderRequestId) return;
          centerSelectedNodeInScroller(networkData);
        });
      }
    };

    void applyNetworkOption();
  };

  const releaseNetworkChart = () => {
    renderRequestId += 1;
    clearLongPressTimer();
    hideNetworkTooltip();
    networkChart
      ?.getDom()
      .removeEventListener("contextmenu", preventMobileNativeContextMenu);
    networkChart?.dispose();
    networkChart = null;
  };

  const recreateNetworkChart = () => {
    releaseNetworkChart();
  };

  const disposeNetworkChart = () => {
    exitAppFullscreen();
    releaseNetworkChart();
    removeNativeContextMenuHandler(networkChartRef.value);
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

  const resizeNetworkChartAfterFullscreenChange = () => {
    requestAnimationFrame(() => {
      networkChart?.resize();
      if (isMobile.value) {
        centerSelectedNodeInScroller();
      }
    });
  };

  const exitAppFullscreen = () => {
    const pane = networkPaneRef.value;
    if (!pane) return;
    pane.classList.remove("network-graph-pane--app-fullscreen");
    if (bodyOverflowBeforeAppFullscreen !== null) {
      document.body.style.overflow = bodyOverflowBeforeAppFullscreen;
      bodyOverflowBeforeAppFullscreen = null;
    }
    resizeNetworkChartAfterFullscreenChange();
  };

  const enterAppFullscreen = () => {
    const pane = networkPaneRef.value;
    if (!pane) return;
    if (pane.classList.contains("network-graph-pane--app-fullscreen")) {
      exitAppFullscreen();
      return;
    }
    bodyOverflowBeforeAppFullscreen = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    pane.classList.add("network-graph-pane--app-fullscreen");
    resizeNetworkChartAfterFullscreenChange();
  };

  const enterFullscreen = async () => {
    const pane = networkPaneRef.value;
    if (!pane) return;
    if (isMobile.value) {
      enterAppFullscreen();
      return;
    }
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
    recreateNetworkChart,
    renderNetworkChart,
    setNetworkChartElement,
    setNetworkPaneElement,
    setNetworkScrollerElement,
    updateNetworkSelection,
    resizeNetworkChart,
    hideNetworkTooltip,
  };
};
