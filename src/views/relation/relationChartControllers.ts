import { ref, type ComputedRef, type Ref } from "vue";
import { init, type ECharts, type EChartsOption } from "echarts/core";
import type { GraphLink, GraphNode, NetworkLayoutMode, SankeyLink, SankeyNode } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateSankeyChartControllerOptions {
  t: Translate;
  isDark: Ref<boolean>;
  activeView: Ref<"network" | "sankey">;
  sankeyChartHeight: ComputedRef<number>;
  sankeyData: ComputedRef<{ nodes: SankeyNode[]; links: SankeyLink[] }>;
  sankeyRight: ComputedRef<number>;
  sankeyLabelWidth: ComputedRef<number>;
  onSelectNode: (node: SankeyNode) => void;
}

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

export const createSankeyChartController = ({
  t,
  isDark,
  activeView,
  sankeyChartHeight,
  sankeyData,
  sankeyRight,
  sankeyLabelWidth,
  onSelectNode,
}: CreateSankeyChartControllerOptions) => {
  const sankeyChartRef = ref<HTMLDivElement>();
  let sankeyChart: ECharts | null = null;

  const renderSankeyChart = () => {
    if (activeView.value !== "sankey" || !sankeyChartRef.value) return;
    if (!sankeyChart) {
      sankeyChart = init(sankeyChartRef.value);
    }
    sankeyChartRef.value.style.height = `${sankeyChartHeight.value}px`;

    sankeyChart.setOption({
      backgroundColor: isDark.value ? "#0f172a" : "#ffffff",
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        formatter: (params: {
          dataType?: string;
          name?: string;
          value?: number;
          data?: Partial<SankeyNode & SankeyLink>;
        }) => {
          const value = params.value ?? params.data?.value ?? 0;
          if (params.dataType === "edge") {
            return [
              `${String(params.data?.source ?? "")} -> ${String(params.data?.target ?? "")}`,
              `${t("relationView.pathCount")}: ${value}`,
            ].join("<br>");
          }

          return [String(params.name ?? params.data?.name ?? ""), `${t("relationView.pathCount")}: ${value}`].join(
            "<br>"
          );
        },
      },
      series: [
        {
          type: "sankey",
          data: sankeyData.value.nodes,
          links: sankeyData.value.links,
          left: 40,
          right: sankeyRight.value,
          top: 24,
          bottom: 24,
          nodeWidth: 18,
          nodeGap: 10,
          layoutIterations: 48,
          draggable: true,
          emphasis: {
            focus: "adjacency",
          },
          lineStyle: {
            color: "gradient",
            curveness: 0.5,
            opacity: isDark.value ? 0.28 : 0.36,
          },
          label: {
            color: isDark.value ? "#e2e8f0" : "#334155",
            fontSize: 12,
            width: sankeyLabelWidth.value,
            overflow: "truncate",
            ellipsis: "...",
          },
          itemStyle: {
            borderColor: isDark.value ? "#334155" : "#e2e8f0",
            borderWidth: 1,
          },
        },
      ],
    });
    sankeyChart.off("dblclick");
    sankeyChart.on("dblclick", (params) => {
      const node = params.data as Partial<SankeyNode>;
      if (node.entityType && node.entityKey) {
        onSelectNode(node as SankeyNode);
      }
    });
    sankeyChart.resize();
  };

  const disposeSankeyChart = () => {
    sankeyChart?.dispose();
    sankeyChart = null;
  };

  const resizeSankeyChart = () => {
    sankeyChart?.resize();
  };

  return {
    disposeSankeyChart,
    renderSankeyChart,
    resizeSankeyChart,
    sankeyChartRef,
  };
};

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
  let networkChart: ECharts | null = null;

  const bindNetworkChartEvents = () => {
    if (!networkChart) return;
    networkChart.off("click");
    networkChart.off("dblclick");
    networkChart.off("contextmenu");
    networkChart.off("mouseup");
    networkChart.on("click", (params) => {
      if (params.dataType !== "node") return;
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
      if (isMobile.value) {
        interactionsBridge.handleNodeTouch(toContextNode(params.data as GraphNode));
      }
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
    });
  };

  const clearNetworkNodeHighlight = () => {
    if (!networkChart) return;
    networkChart.dispatchAction({ type: "downplay", seriesIndex: 0 });
  };

  const renderNetworkChart = (notMerge = false) => {
    if (activeView.value !== "network" || !networkChartRef.value) return;
    if (!networkChart) {
      networkChart = init(networkChartRef.value);
      bindNetworkChartEvents();
    }

    const networkData = getVisibleNetworkData();
    const option = {
      backgroundColor: getGraphColor("background"),
      animationDurationUpdate: 300,
      tooltip: {
        trigger: "item",
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
          layout: "none",
          data: networkData.nodes,
          links: networkData.links,
          center: ["52%", "50%"],
          roam: true,
          draggable: true,
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
        },
      ],
    } satisfies EChartsOption;

    networkChart.setOption(option, { notMerge, lazyUpdate: false });
    clearNetworkNodeHighlight();
    networkChart.resize();
  };

  const disposeNetworkChart = () => {
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
    const pane = document.querySelector(".network-graph-pane") as HTMLElement | null;
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
    resizeNetworkChart,
  };
};
