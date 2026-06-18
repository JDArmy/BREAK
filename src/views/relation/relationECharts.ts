import type { ECharts } from "echarts/core";

type EChartsInit = (dom: HTMLElement) => ECharts;

let networkEChartsPromise: Promise<EChartsInit> | null = null;
let sankeyEChartsPromise: Promise<EChartsInit> | null = null;

export const loadNetworkECharts = () => {
  if (!networkEChartsPromise) {
    networkEChartsPromise = import("./relationNetworkEChartsCore").then(
      ({ initRelationNetworkECharts }) => initRelationNetworkECharts
    );
  }

  return networkEChartsPromise;
};

export const loadSankeyECharts = () => {
  if (!sankeyEChartsPromise) {
    sankeyEChartsPromise = import("./relationSankeyEChartsCore").then(
      ({ initRelationSankeyECharts }) => initRelationSankeyECharts
    );
  }

  return sankeyEChartsPromise;
};
