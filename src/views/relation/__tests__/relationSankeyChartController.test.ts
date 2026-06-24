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

const sizedElement = () => {
  const element = document.createElement("div");
  Object.defineProperty(element, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: 420 });
  return element;
};

const createController = (options?: {
  activeView?: "network" | "sankey" | "analysis";
  isDark?: boolean;
  isMobile?: boolean;
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
    sankeyData: computed(() => ({ nodes, links })),
    sankeyBottom: computed(() => 24),
    sankeyLabelFontSize: computed(() => 13),
    sankeyLabelLineHeight: computed(() => 17),
    sankeyLabelOverflow: computed(() => "truncate"),
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
  const element = sizedElement();
  controller.setSankeyChartElement(element);
  return { chart, controller, element, onOpenNodeActions, onOpenNodeDetail };
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
});
