import { ref, type ComputedRef, type Ref } from "vue";
import type { ECharts } from "echarts/core";
import type { SankeyLink, SankeyNode } from "@/views/relation/relationTypes";
import type { SankeyLabelOverflow, SankeyNodeAlign } from "@/views/relation/relationViewState";
import { loadSankeyECharts } from "@/views/relation/relationECharts";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateSankeyChartControllerOptions {
  t: Translate;
  isDark: Ref<boolean>;
  isMobile: Ref<boolean>;
  activeView: Ref<"network" | "sankey">;
  sankeyChartHeight: ComputedRef<number>;
  sankeyData: ComputedRef<{ nodes: SankeyNode[]; links: SankeyLink[] }>;
  sankeyBottom: ComputedRef<number>;
  sankeyLabelFontSize: ComputedRef<number>;
  sankeyLabelLineHeight: ComputedRef<number>;
  sankeyLabelOverflow: ComputedRef<SankeyLabelOverflow>;
  sankeyLayoutIterations: ComputedRef<number>;
  sankeyLeft: ComputedRef<number>;
  sankeyNodeAlign: ComputedRef<SankeyNodeAlign>;
  sankeyNodeGap: ComputedRef<number>;
  sankeyNodeWidth: ComputedRef<number>;
  sankeyRight: ComputedRef<number>;
  sankeyTop: ComputedRef<number>;
  sankeyLabelWidth: ComputedRef<number>;
  onOpenNodeDetail: (node: SankeyNode) => void;
  onOpenNodeActions: (node: SankeyNode, event?: MouseEvent) => void;
}

export const createSankeyChartController = ({
  t,
  isDark,
  isMobile,
  activeView,
  sankeyChartHeight,
  sankeyData,
  sankeyBottom,
  sankeyLabelFontSize,
  sankeyLabelLineHeight,
  sankeyLabelOverflow,
  sankeyLayoutIterations,
  sankeyLeft,
  sankeyNodeAlign,
  sankeyNodeGap,
  sankeyNodeWidth,
  sankeyRight,
  sankeyTop,
  sankeyLabelWidth,
  onOpenNodeDetail,
  onOpenNodeActions,
}: CreateSankeyChartControllerOptions) => {
  const sankeyChartRef = ref<HTMLDivElement>();
  const sankeyHasData = ref(false);
  let sankeyChart: ECharts | null = null;
  let pendingRenderFrame: number | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  let longPressNode: SankeyNode | undefined;
  let longPressStart: { x: number; y: number } | undefined;
  let renderRequestId = 0;

  const preventMobileNativeContextMenu = (event: Event) => {
    if (!isMobile.value) return;
    event.preventDefault();
  };

  const isSankeyNode = (data: unknown): data is SankeyNode => {
    const node = data as Partial<SankeyNode>;
    return Boolean(node?.entityType && node.entityKey);
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

  const setSankeyChartElement = (element: HTMLDivElement | undefined) => {
    removeNativeContextMenuHandler(sankeyChartRef.value);
    sankeyChartRef.value = element;
    element?.addEventListener("contextmenu", preventMobileNativeContextMenu);
  };

  const renderSankeyChart = (attempt = 0) => {
    if (activeView.value !== "sankey" || !sankeyChartRef.value) return;
    const requestId = ++renderRequestId;
    const currentSankeyData = sankeyData.value;
    sankeyHasData.value = currentSankeyData.nodes.length > 0;
    sankeyChartRef.value.style.height = `${sankeyChartHeight.value}px`;

    if (sankeyChartRef.value.clientWidth === 0 || sankeyChartRef.value.clientHeight === 0) {
      if (attempt >= 6) return;
      if (pendingRenderFrame !== null) {
        cancelAnimationFrame(pendingRenderFrame);
      }
      pendingRenderFrame = requestAnimationFrame(() => {
        pendingRenderFrame = null;
        renderSankeyChart(attempt + 1);
      });
      return;
    }

    const applySankeyOption = async () => {
      if (!sankeyChartRef.value || activeView.value !== "sankey" || requestId !== renderRequestId) return;

      if (!sankeyChart) {
        const init = await loadSankeyECharts();
        if (!sankeyChartRef.value || activeView.value !== "sankey" || requestId !== renderRequestId) return;
        sankeyChart = init(sankeyChartRef.value);
        sankeyChart.getDom().addEventListener("contextmenu", preventMobileNativeContextMenu);
      }
      sankeyChart.dispatchAction({ type: "hideTip" });
      const style = getComputedStyle(document.documentElement);
      const tooltipBackground = style.getPropertyValue("--break-tooltip-bg").trim();
      const tooltipBorder = style.getPropertyValue("--break-tooltip-border").trim();
      const tooltipText = style.getPropertyValue("--break-tooltip-text").trim();

      sankeyChart.setOption({
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--break-bg-primary")
          .trim(),
        animation: !isMobile.value,
        tooltip: {
          show: !isMobile.value,
          trigger: "item",
          triggerOn: "mousemove",
          backgroundColor: tooltipBackground,
          borderColor: tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: tooltipText,
          },
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
            data: currentSankeyData.nodes,
            links: currentSankeyData.links,
            left: sankeyLeft.value,
            right: sankeyRight.value,
            top: sankeyTop.value,
            bottom: sankeyBottom.value,
            nodeWidth: sankeyNodeWidth.value,
            nodeGap: sankeyNodeGap.value,
            nodeAlign: sankeyNodeAlign.value,
            layoutIterations: sankeyLayoutIterations.value,
            draggable: !isMobile.value,
            emphasis: {
              focus: isMobile.value ? "none" : "adjacency",
            },
            lineStyle: {
              color: "gradient",
              curveness: 0.5,
              opacity: isDark.value ? 0.28 : 0.36,
            },
            label: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--break-text-primary")
                .trim(),
              fontSize: sankeyLabelFontSize.value,
              lineHeight: sankeyLabelLineHeight.value,
              width: sankeyLabelWidth.value,
              overflow: sankeyLabelOverflow.value,
              ellipsis: sankeyLabelOverflow.value === "truncate" ? "..." : undefined,
            },
            itemStyle: {
              borderColor: getComputedStyle(document.documentElement)
                .getPropertyValue("--break-border")
                .trim(),
              borderWidth: 1,
            },
          },
        ],
      });
      sankeyChart.off("dblclick");
      sankeyChart.off("contextmenu");
      sankeyChart.off("mousedown");
      sankeyChart.off("mouseup");
      sankeyChart.getZr().off("pointermove");
      sankeyChart.getZr().off("pointerup");
      sankeyChart.getZr().off("pointercancel");
      sankeyChart.getZr().off("globalout");
      sankeyChart.on("dblclick", (params) => {
        if (params.dataType !== "node" || !isSankeyNode(params.data)) return;
        const node = params.data;
        if (node.entityType && node.entityKey) {
          onOpenNodeDetail(node as SankeyNode);
        }
      });
      sankeyChart.on("contextmenu", (params) => {
        if (params.dataType !== "node" || !isSankeyNode(params.data) || !params.event?.event) return;
        params.event.event.preventDefault();
        onOpenNodeActions(params.data, params.event.event as MouseEvent);
      });
      sankeyChart.on("mousedown", (params) => {
        if (!isMobile.value || params.dataType !== "node" || !isSankeyNode(params.data)) return;
        const chartEvent = params.event as { offsetX?: number; offsetY?: number; event?: MouseEvent | PointerEvent };
        const nativeEvent = chartEvent.event;
        const startX = chartEvent.offsetX ?? nativeEvent?.clientX ?? 0;
        const startY = chartEvent.offsetY ?? nativeEvent?.clientY ?? 0;
        clearLongPressTimer();
        longPressNode = params.data;
        longPressStart = { x: startX, y: startY };
        longPressTimer = setTimeout(() => {
          if (!longPressNode) return;
          onOpenNodeActions(longPressNode);
          clearLongPressTimer();
        }, 800);
      });
      sankeyChart.on("mouseup", clearLongPressTimer);
      sankeyChart.getZr().on("pointermove", (event) => {
        if (!longPressStart) return;
        if (Math.hypot(event.offsetX - longPressStart.x, event.offsetY - longPressStart.y) > 10) {
          clearLongPressTimer();
        }
      });
      sankeyChart.getZr().on("pointerup", clearLongPressTimer);
      sankeyChart.getZr().on("pointercancel", clearLongPressTimer);
      sankeyChart.getZr().on("globalout", clearLongPressTimer);
      if (!isMobile.value) {
        sankeyChart.resize();
      }
    };

    void applySankeyOption();
  };

  const updateSankeyTheme = () => {
    if (activeView.value !== "sankey") return;
    renderSankeyChart();
  };

  const disposeSankeyChart = () => {
    renderRequestId += 1;
    clearLongPressTimer();
    if (pendingRenderFrame !== null) {
      cancelAnimationFrame(pendingRenderFrame);
      pendingRenderFrame = null;
    }
    sankeyChart?.dispatchAction({ type: "hideTip" });
    sankeyChart?.getDom().removeEventListener("contextmenu", preventMobileNativeContextMenu);
    sankeyChart?.dispose();
    sankeyChart = null;
    sankeyHasData.value = false;
    removeNativeContextMenuHandler(sankeyChartRef.value);
  };

  const hideSankeyTooltip = () => {
    sankeyChart?.dispatchAction({ type: "hideTip" });
  };

  const resizeSankeyChart = () => {
    sankeyChart?.resize();
  };

  return {
    disposeSankeyChart,
    renderSankeyChart,
    resizeSankeyChart,
    updateSankeyTheme,
    setSankeyChartElement,
    sankeyChartRef,
    hideSankeyTooltip,
    sankeyHasData,
  };
};
