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
  let networkChart: ECharts | null = null;

  const setNetworkChartElement = (element: HTMLDivElement | undefined) => {
    networkChartRef.value = element;
  };

  const setNetworkPaneElement = (element: HTMLDivElement | undefined) => {
    networkPaneRef.value = element;
  };

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
    resizeNetworkChart,
  };
};
