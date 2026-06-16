import type { ECharts } from "echarts/core";

type EChartsInit = (dom: HTMLElement) => ECharts;

let networkEChartsPromise: Promise<EChartsInit> | null = null;
let sankeyEChartsPromise: Promise<EChartsInit> | null = null;

export const loadNetworkECharts = () => {
  if (!networkEChartsPromise) {
    networkEChartsPromise = Promise.all([
      import("echarts/core"),
      import("echarts/charts"),
      import("echarts/components"),
      import("echarts/renderers"),
    ]).then(([core, charts, components, renderers]) => {
      core.use([
        charts.GraphChart,
        components.LegendComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer,
      ]);
      return core.init;
    });
  }

  return networkEChartsPromise;
};

export const loadSankeyECharts = () => {
  if (!sankeyEChartsPromise) {
    sankeyEChartsPromise = Promise.all([
      import("echarts/core"),
      import("echarts/charts"),
      import("echarts/components"),
      import("echarts/renderers"),
    ]).then(([core, charts, components, renderers]) => {
      core.use([
        charts.SankeyChart,
        components.LegendComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer,
      ]);
      return core.init;
    });
  }

  return sankeyEChartsPromise;
};
