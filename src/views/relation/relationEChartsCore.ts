import { init, use, type ECharts } from "echarts/core";
import { GraphChart, SankeyChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

let registered = false;

export const initRelationECharts = (dom: HTMLElement): ECharts => {
  if (!registered) {
    use([GraphChart, SankeyChart, LegendComponent, TooltipComponent, CanvasRenderer]);
    registered = true;
  }

  return init(dom);
};
