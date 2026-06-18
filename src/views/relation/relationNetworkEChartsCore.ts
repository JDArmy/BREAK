import { GraphChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { init, use, type ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

let registered = false;

export const initRelationNetworkECharts = (dom: HTMLElement): ECharts => {
  if (!registered) {
    use([GraphChart, TooltipComponent, CanvasRenderer]);
    registered = true;
  }

  return init(dom);
};
