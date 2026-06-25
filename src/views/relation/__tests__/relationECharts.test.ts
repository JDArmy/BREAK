import { beforeEach, describe, expect, it, vi } from "vitest";

const { init, use } = vi.hoisted(() => ({
  init: vi.fn((dom: HTMLElement) => ({ dom, disposed: false })),
  use: vi.fn(),
}));

vi.mock("echarts/charts", () => ({
  GraphChart: { type: "graph" },
  SankeyChart: { type: "sankey" },
}));

vi.mock("echarts/components", () => ({
  TooltipComponent: { type: "tooltip" },
}));

vi.mock("echarts/core", () => ({
  init,
  use,
}));

vi.mock("echarts/renderers", () => ({
  CanvasRenderer: { type: "canvas" },
}));

describe("relationECharts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loadNetworkECharts 缓存网络图初始化函数", async () => {
    const { loadNetworkECharts } = await import("../relationECharts");

    const first = await loadNetworkECharts();
    const second = await loadNetworkECharts();
    const element = document.createElement("div");

    expect(first).toBe(second);
    expect(first(element)).toEqual({ dom: element, disposed: false });
    expect(use).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(element);
  });

  it("loadSankeyECharts 缓存桑基图初始化函数", async () => {
    const { loadSankeyECharts } = await import("../relationECharts");

    const first = await loadSankeyECharts();
    const second = await loadSankeyECharts();
    const element = document.createElement("div");

    expect(first).toBe(second);
    expect(first(element)).toEqual({ dom: element, disposed: false });
    expect(use).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(element);
  });

  it("核心初始化函数只注册一次对应图表能力", async () => {
    const { initRelationNetworkECharts } = await import("../relationNetworkEChartsCore");
    const { initRelationSankeyECharts } = await import("../relationSankeyEChartsCore");
    const networkElement = document.createElement("div");
    const sankeyElement = document.createElement("div");

    initRelationNetworkECharts(networkElement);
    initRelationNetworkECharts(networkElement);
    initRelationSankeyECharts(sankeyElement);
    initRelationSankeyECharts(sankeyElement);

    expect(use).toHaveBeenCalledTimes(2);
    expect(init).toHaveBeenCalledTimes(4);
    expect(init).toHaveBeenNthCalledWith(1, networkElement);
    expect(init).toHaveBeenNthCalledWith(3, sankeyElement);
  });
});
