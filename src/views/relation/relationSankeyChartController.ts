import { ref, type ComputedRef, type Ref } from "vue";
import { init, type ECharts } from "echarts/core";
import type { SankeyLink, SankeyNode } from "@/views/relation/relationTypes";

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

  const setSankeyChartElement = (element: HTMLDivElement | undefined) => {
    sankeyChartRef.value = element;
  };

  const renderSankeyChart = () => {
    if (activeView.value !== "sankey" || !sankeyChartRef.value) return;
    if (!sankeyChart) {
      sankeyChart = init(sankeyChartRef.value);
    }
    sankeyChartRef.value.style.height = `${sankeyChartHeight.value}px`;
    const style = getComputedStyle(document.documentElement);
    const tooltipBackground = style.getPropertyValue("--break-tooltip-bg").trim();
    const tooltipBorder = style.getPropertyValue("--break-tooltip-border").trim();
    const tooltipText = style.getPropertyValue("--break-tooltip-text").trim();

    sankeyChart.setOption({
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue("--break-bg-primary")
        .trim(),
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
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--break-text-primary")
              .trim(),
            fontSize: 12,
            width: sankeyLabelWidth.value,
            overflow: "truncate",
            ellipsis: "...",
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
    sankeyChart.resize();
  };

  const updateSankeyTheme = () => {
    if (activeView.value !== "sankey") return;
    renderSankeyChart();
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
    updateSankeyTheme,
    setSankeyChartElement,
    sankeyChartRef,
  };
};
