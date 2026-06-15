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
    setSankeyChartElement,
    sankeyChartRef,
  };
};
