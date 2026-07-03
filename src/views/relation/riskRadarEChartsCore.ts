import { RadarChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { init, use, type ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

let registered = false;

export const initRiskRadarECharts = (dom: HTMLElement): ECharts => {
  if (!registered) {
    use([RadarChart, TooltipComponent, CanvasRenderer]);
    registered = true;
  }

  return init(dom);
};
