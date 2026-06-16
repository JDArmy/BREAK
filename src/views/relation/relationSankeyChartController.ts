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
  onSelectNode: (node: SankeyNode) => void;
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
  onSelectNode,
}: CreateSankeyChartControllerOptions) => {
  const sankeyChartRef = ref<HTMLDivElement>();
  const sankeyHasData = ref(false);
  let sankeyChart: ECharts | null = null;
  let pendingRenderFrame: number | null = null;
  let renderRequestId = 0;

  const setSankeyChartElement = (element: HTMLDivElement | undefined) => {
    sankeyChartRef.value = element;
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
            draggable: true,
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
      sankeyChart.on("dblclick", (params) => {
        const node = params.data as Partial<SankeyNode>;
        if (node.entityType && node.entityKey) {
          onSelectNode(node as SankeyNode);
        }
      });
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
    if (pendingRenderFrame !== null) {
      cancelAnimationFrame(pendingRenderFrame);
      pendingRenderFrame = null;
    }
    sankeyChart?.dispatchAction({ type: "hideTip" });
    sankeyChart?.dispose();
    sankeyChart = null;
    sankeyHasData.value = false;
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
