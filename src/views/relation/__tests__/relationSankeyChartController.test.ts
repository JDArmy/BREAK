import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { createSankeyChartController } from "../relationSankeyChartController";
import { RelationType, type SankeyLink, type SankeyNode } from "../relationTypes";

const { loadSankeyECharts } = vi.hoisted(() => ({
  loadSankeyECharts: vi.fn(),
}));

vi.mock("@/views/relation/relationECharts", () => ({
  loadSankeyECharts,
}));

type ChartHandler = (params: unknown) => void;
type SankeyChart = ReturnType<typeof createChart>;

const nodes: SankeyNode[] = [
  {
    name: "风险",
    entityType: RelationType.risk,
    entityKey: "R0001",
    itemStyle: { color: "#ef4444" },
  },
  {
    name: "规避手段",
    entityType: RelationType.avoidance,
    entityKey: "A0001",
    itemStyle: { color: "#22c55e" },
  },
];

const links: SankeyLink[] = [
  {
    source: "风险",
    target: "规避手段",
    value: 2,
  },
];

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createChart = () => {
  const handlers = new Map<string, ChartHandler>();
  const zrHandlers = new Map<string, ChartHandler>();
  const dom = document.createElement("div");
  const chart = {
    handlers,
    zrHandlers,
    dispatchAction: vi.fn(),
    dispose: vi.fn(),
    getDom: vi.fn(() => dom),
    getZr: vi.fn(() => ({
      off: vi.fn((event: string) => zrHandlers.delete(event)),
      on: vi.fn((event: string, handler: ChartHandler) => {
        zrHandlers.set(event, handler);
      }),
    })),
    off: vi.fn((event: string) => handlers.delete(event)),
    on: vi.fn((event: string, handler: ChartHandler) => {
      handlers.set(event, handler);
    }),
    resize: vi.fn(),
    setOption: vi.fn(),
  };
  return chart;
};

const sizedElement = (width = 800, height = 420) => {
  const element = document.createElement("div");
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: height,
  });
  return element;
};

const createController = (options?: {
  activeView?: "network" | "sankey" | "analysis";
  element?: HTMLDivElement;
  isDark?: boolean;
  isMobile?: boolean;
  labelOverflow?: "break" | "breakAll" | "truncate" | "none";
  sankeyData?: { nodes: SankeyNode[]; links: SankeyLink[] };
}) => {
  const chart = createChart();
  loadSankeyECharts.mockResolvedValue(vi.fn(() => chart));
  const onOpenNodeDetail = vi.fn();
  const onOpenNodeActions = vi.fn();
  const controller = createSankeyChartController({
    t: (key) => `t:${key}`,
    isDark: ref(options?.isDark ?? false),
    isMobile: ref(options?.isMobile ?? false),
    activeView: ref(options?.activeView ?? "sankey"),
    sankeyChartHeight: computed(() => 460),
    sankeyData: computed(() => options?.sankeyData ?? { nodes, links }),
    sankeyBottom: computed(() => 24),
    sankeyLabelFontSize: computed(() => 13),
    sankeyLabelLineHeight: computed(() => 17),
    sankeyLabelOverflow: computed(() => options?.labelOverflow ?? "truncate"),
    sankeyLayoutIterations: computed(() => 48),
    sankeyLeft: computed(() => 40),
    sankeyNodeAlign: computed(() => "justify"),
    sankeyNodeGap: computed(() => 10),
    sankeyNodeWidth: computed(() => 18),
    sankeyRight: computed(() => 280),
    sankeyTop: computed(() => 24),
    sankeyLabelWidth: computed(() => 220),
    onOpenNodeDetail,
    onOpenNodeActions,
  });
  const element = options?.element ?? sizedElement();
  controller.setSankeyChartElement(element);
  return { chart, controller, element, onOpenNodeActions, onOpenNodeDetail };
};

const latestOption = (chart: SankeyChart) =>
  chart.setOption.mock.calls.at(-1)?.[0] as {
    animation?: boolean;
    series: Array<{
      data: SankeyNode[];
      draggable?: boolean;
      emphasis?: { focus?: string };
      label?: { ellipsis?: string; overflow?: string };
      lineStyle?: { opacity?: number };
      links: SankeyLink[];
    }>;
    tooltip?: {
      formatter: (params: {
        dataType?: string;
        name?: string;
        value?: number;
        data?: Partial<SankeyNode & SankeyLink>;
      }) => string;
      show?: boolean;
    };
  };

describe("relationSankeyChartController", () => {
  beforeEach(() => {
    loadSankeyECharts.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads ECharts lazily and renders Sankey data with responsive options", async () => {
    const { chart, controller, element } = createController();

    controller.renderSankeyChart();
    await flushPromises();

    expect(loadSankeyECharts).toHaveBeenCalledTimes(1);
    expect(controller.sankeyHasData.value).toBe(true);
    expect(element.style.height).toBe("460px");
    expect(chart.setOption).toHaveBeenCalledWith(
      expect.objectContaining({
        animation: true,
        series: [
          expect.objectContaining({
            data: nodes,
            draggable: true,
            label: expect.objectContaining({
              ellipsis: "...",
              fontSize: 13,
              overflow: "truncate",
              width: 220,
            }),
            layoutIterations: 48,
            links,
            nodeAlign: "justify",
            nodeGap: 10,
            nodeWidth: 18,
            type: "sankey",
          }),
        ],
      })
    );
    expect(chart.dispatchAction).toHaveBeenCalledWith({ type: "hideTip" });
    expect(chart.resize).toHaveBeenCalled();
  });

  it("skips rendering when inactive, missing element, or async render becomes stale", async () => {
    const inactive = createController({ activeView: "network" });
    inactive.controller.renderSankeyChart();
    await flushPromises();
    expect(loadSankeyECharts).not.toHaveBeenCalled();

    const missingElement = createController();
    missingElement.controller.setSankeyChartElement(undefined);
    missingElement.controller.renderSankeyChart();
    await flushPromises();
    expect(loadSankeyECharts).not.toHaveBeenCalled();

    let resolveLoader: (init: () => SankeyChart) => void = () => {};
    loadSankeyECharts.mockReturnValue(
      new Promise((resolve) => {
        resolveLoader = resolve;
      }),
    );
    const stale = createController();
    stale.controller.renderSankeyChart();
    stale.controller.setSankeyChartElement(undefined);
    resolveLoader(() => stale.chart);
    await flushPromises();

    expect(stale.chart.setOption).not.toHaveBeenCalled();
  });

  it("marks empty sankey data and still applies an empty chart option", async () => {
    const { chart, controller } = createController({
      sankeyData: { nodes: [], links: [] },
    });

    controller.renderSankeyChart();
    await flushPromises();

    expect(controller.sankeyHasData.value).toBe(false);
    expect(latestOption(chart).series[0]).toEqual(
      expect.objectContaining({
        data: [],
        links: [],
      }),
    );
  });

  it("retries zero-sized chart elements and cancels pending frame on dispose", async () => {
    vi.useFakeTimers();
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => window.setTimeout(() => callback(0), 1));
    const cancelAnimationFrameSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation((id) => window.clearTimeout(id));
    const { controller } = createController({ element: sizedElement(0, 0) });

    controller.renderSankeyChart();
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);

    controller.renderSankeyChart();
    expect(cancelAnimationFrameSpy).toHaveBeenCalledTimes(1);

    controller.disposeSankeyChart();
    await vi.runAllTimersAsync();
    expect(loadSankeyECharts).not.toHaveBeenCalled();
  });

  it("renders mobile sankey options through deferred animation frames", async () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const { chart, controller } = createController({
      isDark: true,
      isMobile: true,
      labelOverflow: "break",
    });

    controller.renderSankeyChart();
    await flushPromises();

    const option = latestOption(chart);
    expect(option).toEqual(
      expect.objectContaining({
        animation: false,
        tooltip: expect.objectContaining({ show: false }),
      }),
    );
    expect(option.series[0]).toEqual(
      expect.objectContaining({
        draggable: false,
        emphasis: { focus: "none" },
        label: expect.objectContaining({
          ellipsis: undefined,
          overflow: "break",
        }),
        lineStyle: expect.objectContaining({
          opacity: 0.28,
        }),
      }),
    );
    expect(chart.resize).not.toHaveBeenCalled();
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
  });

  it("formats node and edge tooltips with path counts", async () => {
    const { chart, controller } = createController();

    controller.renderSankeyChart();
    await flushPromises();

    const formatter = latestOption(chart).tooltip?.formatter;
    expect(
      formatter?.({
        dataType: "edge",
        data: links[0],
      }),
    ).toBe("风险 -> 规避手段<br>t:relationView.pathCount: 2");
    expect(
      formatter?.({
        dataType: "node",
        name: "风险",
        value: 3,
      }),
    ).toBe("风险<br>t:relationView.pathCount: 3");
    expect(
      formatter?.({
        dataType: "node",
        data: { name: "备用节点", value: 4 },
      }),
    ).toBe("备用节点<br>t:relationView.pathCount: 4");
  });

  it("opens node details and action menus from chart events", async () => {
    const { chart, controller, onOpenNodeActions, onOpenNodeDetail } = createController();
    const preventDefault = vi.fn();

    controller.renderSankeyChart();
    await flushPromises();

    chart.handlers.get("dblclick")?.({ dataType: "node", data: nodes[0] });
    expect(onOpenNodeDetail).toHaveBeenCalledWith(nodes[0]);

    chart.handlers.get("contextmenu")?.({
      dataType: "node",
      data: nodes[1],
      event: { event: { preventDefault } },
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(onOpenNodeActions).toHaveBeenCalledWith(nodes[1], { preventDefault });

    chart.handlers.get("dblclick")?.({ dataType: "edge", data: links[0] });
    chart.handlers.get("dblclick")?.({ dataType: "node", data: { name: "无 ID" } });
    chart.handlers.get("contextmenu")?.({
      dataType: "node",
      data: nodes[1],
    });
    chart.handlers.get("contextmenu")?.({
      dataType: "edge",
      data: links[0],
      event: { event: { preventDefault } },
    });

    expect(onOpenNodeDetail).toHaveBeenCalledTimes(1);
    expect(onOpenNodeActions).toHaveBeenCalledTimes(1);
  });

  it("supports mobile long press actions and cancels them on movement", async () => {
    vi.useFakeTimers();
    const { chart, controller, onOpenNodeActions } = createController({ isMobile: true });

    controller.renderSankeyChart();
    await vi.runAllTimersAsync();
    await flushPromises();

    chart.handlers.get("mousedown")?.({
      dataType: "node",
      data: nodes[0],
      event: { offsetX: 10, offsetY: 10 },
    });
    chart.zrHandlers.get("pointermove")?.({ offsetX: 40, offsetY: 10 });
    vi.advanceTimersByTime(850);
    expect(onOpenNodeActions).not.toHaveBeenCalled();

    chart.handlers.get("mousedown")?.({
      dataType: "node",
      data: nodes[1],
      event: { offsetX: 10, offsetY: 10 },
    });
    vi.advanceTimersByTime(850);
    expect(onOpenNodeActions).toHaveBeenCalledWith(nodes[1]);

    chart.handlers.get("mousedown")?.({
      dataType: "node",
      data: nodes[0],
      event: { event: { clientX: 10, clientY: 10 } },
    });
    chart.zrHandlers.get("pointerup")?.({});
    vi.advanceTimersByTime(850);
    expect(onOpenNodeActions).toHaveBeenCalledTimes(1);

    chart.handlers.get("mousedown")?.({
      dataType: "node",
      data: nodes[0],
      event: { offsetX: 10, offsetY: 10 },
    });
    chart.zrHandlers.get("pointercancel")?.({});
    vi.advanceTimersByTime(850);
    expect(onOpenNodeActions).toHaveBeenCalledTimes(1);

    chart.handlers.get("mousedown")?.({
      dataType: "node",
      data: nodes[0],
      event: { offsetX: 10, offsetY: 10 },
    });
    chart.zrHandlers.get("globalout")?.({});
    vi.advanceTimersByTime(850);
    expect(onOpenNodeActions).toHaveBeenCalledTimes(1);
  });

  it("updates theme, hides tooltip, resizes, and disposes chart resources", async () => {
    const { chart, controller, element } = createController();

    controller.renderSankeyChart();
    await flushPromises();

    controller.hideSankeyTooltip();
    controller.resizeSankeyChart();
    controller.updateSankeyTheme();
    await flushPromises();

    expect(chart.dispatchAction).toHaveBeenCalledWith({ type: "hideTip" });
    expect(chart.resize).toHaveBeenCalled();
    expect(chart.setOption).toHaveBeenCalledTimes(2);

    controller.disposeSankeyChart();
    expect(chart.dispose).toHaveBeenCalled();
    expect(controller.sankeyHasData.value).toBe(false);

    const contextMenuEvent = new Event("contextmenu", { cancelable: true });
    element.dispatchEvent(contextMenuEvent);
    expect(contextMenuEvent.defaultPrevented).toBe(false);
  });

  it("handles safe no-chart operations, inactive theme updates, and native context menu cleanup", async () => {
    const { controller } = createController({ activeView: "analysis" });
    controller.hideSankeyTooltip();
    controller.resizeSankeyChart();
    controller.updateSankeyTheme();
    await flushPromises();
    expect(loadSankeyECharts).not.toHaveBeenCalled();

    const firstElement = document.createElement("div");
    const secondElement = document.createElement("div");
    const mobile = createController({
      element: firstElement,
      isMobile: true,
    });
    const firstContextMenu = new Event("contextmenu", { cancelable: true });
    firstElement.dispatchEvent(firstContextMenu);
    expect(firstContextMenu.defaultPrevented).toBe(true);

    mobile.controller.setSankeyChartElement(secondElement);
    const oldContextMenu = new Event("contextmenu", { cancelable: true });
    firstElement.dispatchEvent(oldContextMenu);
    expect(oldContextMenu.defaultPrevented).toBe(false);

    mobile.controller.disposeSankeyChart();
    const secondContextMenu = new Event("contextmenu", { cancelable: true });
    secondElement.dispatchEvent(secondContextMenu);
    expect(secondContextMenu.defaultPrevented).toBe(false);
  });
});
