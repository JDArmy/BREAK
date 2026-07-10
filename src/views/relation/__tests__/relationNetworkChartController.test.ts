import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createNetworkChartController } from "../relationNetworkChartController";
import { RelationType, type GraphLink, type GraphNode } from "../relationTypes";

const { loadNetworkECharts } = vi.hoisted(() => ({
  loadNetworkECharts: vi.fn(),
}));

vi.mock("@/views/relation/relationECharts", () => ({
  loadNetworkECharts,
}));

type ChartHandler = (params: unknown) => void;
type NetworkChart = ReturnType<typeof createChart>;
type ResizeObserverCallback = () => void;

const resizeObserverInstances: Array<{
  callback: ResizeObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
}> = [];

class TestResizeObserver {
  callback: ResizeObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObserverInstances.push(this);
  }
}

const node: GraphNode = {
  id: "R0001",
  name: "R0001",
  type: RelationType.risk,
  text: "流程自动化攻击",
  labelText: "流程自动化",
  symbolSize: 64,
  itemStyle: {
    color: "#fff",
    borderColor: "#111",
    borderWidth: 1,
  },
  x: 10,
  y: 20,
};

const linkedNode: GraphNode = {
  ...node,
  id: "A0001",
  name: "A0001",
  type: RelationType.avoidance,
  text: "人机验证",
  labelText: "人机验证",
  x: 120,
  y: 80,
};

const link: GraphLink = {
  source: "R0001",
  target: "A0001",
  sourceTitle: "流程自动化攻击",
  targetTitle: "人机验证",
  sourceTypeTitle: "风险",
  targetTypeTitle: "规避手段",
  sourceDisplay: "风险: 流程自动化攻击",
  targetDisplay: "规避手段: 人机验证",
  text: "规避手段",
  sourceFields: ["avoidances"],
  evidenceLabel: "直接",
  explanation: {
    relationKey: "R0001-A0001",
    fromId: "R0001",
    toId: "A0001",
    relationType: "规避手段",
    sourceFields: ["avoidances"],
    evidenceLevel: "direct",
    explanation: "<script>alert(1)</script>",
    impactHint: "降低自动化攻击成功率",
    qualityFlags: ["review <required>"],
  },
  lineStyle: {
    color: "#888",
    opacity: 0.5,
    curveness: 0.18,
  },
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
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

const createChart = () => {
  const handlers = new Map<string, ChartHandler>();
  const zrHandlers = new Map<string, ChartHandler>();
  const dom = document.createElement("div");
  const chart = {
    handlers,
    zrHandlers,
    dispatchAction: vi.fn(),
    dispose: vi.fn(),
    getDataURL: vi.fn(() => "data:image/png;base64,abc"),
    getDom: vi.fn(() => dom),
    getOption: vi.fn(() => ({
      series: [
        {
          data: [{ ...node, x: 33, y: 44 }],
        },
      ],
    })),
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

const createController = (options?: {
  activeView?: "network" | "sankey";
  getVisibleNetworkData?: () => { nodes: GraphNode[]; links: GraphLink[] };
  isDark?: boolean;
  isMobile?: boolean;
  networkState?: { zoom: number; layout: "horizontal" | "force" };
  networkChartElement?: HTMLDivElement;
}) => {
  const chart = createChart();
  loadNetworkECharts.mockResolvedValue(vi.fn(() => chart));

  const selectedNetworkNodeId = ref("");
  const draggedNodePositions = ref<Record<string, { x: number; y: number }>>({});
  const interactionsBridge = {
    handleNodeTouch: vi.fn(),
    openNodeDetail: vi.fn(),
    openRelationDetail: vi.fn(),
    nodeClick: vi.fn(),
  };
  const controller = createNetworkChartController({
    t: (key) => `t:${key}`,
    isDark: ref(options?.isDark ?? false),
    isMobile: ref(options?.isMobile ?? false),
    activeView: ref(options?.activeView ?? "network"),
    networkState: options?.networkState ?? { zoom: 1.25, layout: "horizontal" },
    selectedNetworkNodeId,
    draggedNodePositions,
    getVisibleNetworkData:
      options?.getVisibleNetworkData ??
      (() => ({ nodes: [node, linkedNode], links: [link] })),
    getGraphColor: (key) => `color:${key}`,
    toContextNode: (graphNode) => ({ id: graphNode.id, type: graphNode.type }),
    getDownloadFilename: () => "relation-test.png",
    interactionsBridge,
  });

  const element = options?.networkChartElement ?? sizedElement();
  controller.setNetworkChartElement(element);

  return {
    chart,
    controller,
    draggedNodePositions,
    element,
    interactionsBridge,
    selectedNetworkNodeId,
  };
};

const latestOption = (chart: NetworkChart) =>
  chart.setOption.mock.calls.at(-1)?.[0] as {
    series: Array<{
      blur?: unknown;
      draggable?: boolean;
      force?: unknown;
      layout?: string;
      roamTrigger?: string;
    }>;
    tooltip?: {
      formatter: (params: {
        dataType?: string;
        data?: GraphNode | GraphLink;
      }) => string;
    };
  };

describe("relationNetworkChartController", () => {
  beforeEach(() => {
    loadNetworkECharts.mockReset();
    resizeObserverInstances.length = 0;
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads ECharts lazily and renders visible network data", async () => {
    const { chart, controller } = createController();

    controller.renderNetworkChart(true);
    await flushPromises();

    expect(loadNetworkECharts).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundColor: "color:background",
        series: [
          expect.objectContaining({
            data: [node, linkedNode],
            draggable: true,
            layout: "none",
            links: [link],
            roamTrigger: "global",
            zoom: 1.25,
          }),
        ],
      }),
      { notMerge: true, lazyUpdate: false }
    );
    expect(chart.dispatchAction).toHaveBeenCalledWith({ type: "hideTip" });
    expect(chart.resize).toHaveBeenCalled();
  });

  it("waits for a non-zero container size before initializing ECharts", async () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    let width = 0;
    let height = 0;
    const element = document.createElement("div");
    Object.defineProperties(element, {
      clientWidth: { configurable: true, get: () => width },
      clientHeight: { configurable: true, get: () => height },
    });
    const { chart, controller } = createController({ networkChartElement: element });

    controller.renderNetworkChart();
    await flushPromises();

    expect(loadNetworkECharts).not.toHaveBeenCalled();
    expect(chart.setOption).not.toHaveBeenCalled();

    width = 800;
    height = 420;
    resizeObserverInstances[0].callback();
    await flushPromises();

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
    expect(loadNetworkECharts).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenCalledTimes(1);
  });

  it("skips rendering when inactive, missing element, or async render becomes stale", async () => {
    const inactive = createController({ activeView: "sankey" });
    inactive.controller.renderNetworkChart();
    await flushPromises();
    expect(loadNetworkECharts).not.toHaveBeenCalled();

    const missingElement = createController();
    missingElement.controller.setNetworkChartElement(undefined);
    missingElement.controller.renderNetworkChart();
    await flushPromises();
    expect(loadNetworkECharts).not.toHaveBeenCalled();

    let resolveLoader: (init: () => NetworkChart) => void = () => {};
    loadNetworkECharts.mockReturnValue(
      new Promise((resolve) => {
        resolveLoader = resolve;
      }),
    );
    const stale = createController();
    stale.controller.renderNetworkChart();
    stale.controller.setNetworkChartElement(undefined);
    resolveLoader(() => stale.chart);
    await flushPromises();

    expect(stale.chart.setOption).not.toHaveBeenCalled();
  });

  it("renders force layout and mobile-safe options", async () => {
    const { chart, controller } = createController({
      isDark: true,
      isMobile: true,
      networkState: { zoom: 0.75, layout: "force" },
    });

    controller.renderNetworkChart();
    await flushPromises();

    const option = latestOption(chart);
    expect(option.series[0]).toEqual(
      expect.objectContaining({
        animation: true,
        blur: undefined,
        draggable: false,
        force: expect.objectContaining({
          preventOverlap: 44,
          repulsion: 1240,
        }),
        layout: "force",
        zoom: 0.75,
      }),
    );
  });

  it("formats and escapes node and edge tooltips", async () => {
    const unsafeNode = {
      ...node,
      text: "第一行\n<script>alert(1)</script>",
    };
    const { chart, controller } = createController({
      getVisibleNetworkData: () => ({ nodes: [unsafeNode], links: [link] }),
    });

    controller.renderNetworkChart();
    await flushPromises();

    const formatter = latestOption(chart).tooltip?.formatter;
    expect(
      formatter?.({ dataType: "node", data: unsafeNode }),
    ).toBe('第一行<br><script>alert(1)</script><br><span style="opacity:.6;font-size:11px;">t:relationView.doubleClickToView</span>');
    const edgeHtml = formatter?.({ dataType: "edge", data: link }) ?? "";
    expect(edgeHtml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(edgeHtml).toContain("review &lt;required&gt;");
    expect(formatter?.({ dataType: "unknown" })).toBe("");
  });

  it("handles node selection, detail opening, context menu actions, and drag persistence", async () => {
    const {
      chart,
      controller,
      draggedNodePositions,
      interactionsBridge,
      selectedNetworkNodeId,
    } = createController();
    const preventDefault = vi.fn();

    controller.renderNetworkChart();
    await flushPromises();

    chart.handlers.get("click")?.({ dataType: "node", data: node });
    expect(selectedNetworkNodeId.value).toBe("R0001");

    chart.handlers.get("dblclick")?.({ dataType: "node", data: linkedNode });
    expect(selectedNetworkNodeId.value).toBe("A0001");
    expect(interactionsBridge.openNodeDetail).toHaveBeenCalledWith({
      id: "A0001",
      type: RelationType.avoidance,
    });

    chart.handlers.get("contextmenu")?.({
      dataType: "node",
      data: node,
      event: { event: { preventDefault } },
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(interactionsBridge.nodeClick).toHaveBeenCalledWith(
      { id: "R0001", type: RelationType.risk },
      { preventDefault }
    );

    chart.handlers.get("mouseup")?.({ dataType: "node", dataIndex: 0, data: node });
    expect(draggedNodePositions.value).toEqual({
      R0001: { x: 33, y: 44 },
    });

    chart.handlers.get("dragend")?.({
      dataType: "node",
      data: { ...linkedNode, x: 50, y: 60 },
    });
    expect(draggedNodePositions.value).toEqual({
      A0001: { x: 50, y: 60 },
      R0001: { x: 33, y: 44 },
    });

    chart.handlers.get("click")?.({ dataType: "edge", data: link });
    chart.handlers.get("dblclick")?.({ dataType: "edge", data: link });
    chart.handlers.get("contextmenu")?.({ dataType: "node", data: node });
    chart.handlers.get("mouseup")?.({ dataType: "edge", data: link });
    expect(interactionsBridge.openRelationDetail).not.toHaveBeenCalled();
  });

  it("supports mobile long press actions and cancels them on pointer movement", async () => {
    vi.useFakeTimers();
    const { chart, controller, interactionsBridge, selectedNetworkNodeId } =
      createController({ isMobile: true });

    controller.renderNetworkChart();
    await flushPromises();

    chart.handlers.get("mousedown")?.({
      dataType: "node",
      data: node,
      event: { offsetX: 10, offsetY: 10 },
    });
    chart.zrHandlers.get("pointermove")?.({ offsetX: 30, offsetY: 10 });
    vi.advanceTimersByTime(850);
    expect(interactionsBridge.handleNodeTouch).not.toHaveBeenCalled();

    chart.handlers.get("mousedown")?.({
      dataType: "node",
      data: linkedNode,
      event: { offsetX: 10, offsetY: 10 },
    });
    vi.advanceTimersByTime(850);

    expect(selectedNetworkNodeId.value).toBe("A0001");
    expect(interactionsBridge.handleNodeTouch).toHaveBeenCalledWith({
      id: "A0001",
      type: RelationType.avoidance,
    });

    chart.handlers.get("mousedown")?.({
      dataType: "node",
      data: node,
      event: { event: { clientX: 10, clientY: 10 } },
    });
    chart.zrHandlers.get("pointerup")?.({});
    vi.advanceTimersByTime(850);
    expect(interactionsBridge.handleNodeTouch).toHaveBeenCalledTimes(1);
  });

  it("centers the selected node in the mobile scroller after rendering", async () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const element = sizedElement(1000, 600);
    const scroller = sizedElement(320, 180);
    const { controller, selectedNetworkNodeId } = createController({
      isMobile: true,
      networkChartElement: element,
    });
    selectedNetworkNodeId.value = "A0001";
    controller.setNetworkScrollerElement(scroller);

    controller.renderNetworkChart();
    await flushPromises();

    expect(scroller.scrollLeft).toBeGreaterThan(0);
    expect(scroller.scrollTop).toBeGreaterThan(0);
    expect(requestAnimationFrameSpy).toHaveBeenCalled();
  });

  it("updates selection, resizes, hides tooltip, and recreates chart safely", async () => {
    const { chart, controller } = createController();

    controller.downloadNetworkChart();
    controller.hideNetworkTooltip();
    controller.resizeNetworkChart();
    controller.updateNetworkSelection();

    controller.renderNetworkChart();
    await flushPromises();

    controller.updateNetworkSelection();
    controller.hideNetworkTooltip();
    controller.resizeNetworkChart();
    controller.recreateNetworkChart();
    controller.resizeNetworkChart();

    expect(chart.setOption).toHaveBeenCalledWith(
      {
        series: [
          {
            type: "graph",
            data: [node, linkedNode],
          },
        ],
      },
      { notMerge: false, lazyUpdate: false },
    );
    expect(chart.dispatchAction).toHaveBeenCalledWith({ type: "hideTip" });
    expect(chart.dispatchAction).toHaveBeenCalledWith({
      type: "downplay",
      seriesIndex: 0,
    });
    expect(chart.dispose).toHaveBeenCalled();
  });

  it("resizes the chart when observed layout elements change size", async () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const chartElement = sizedElement();
    const paneElement = document.createElement("div");
    const scrollerElement = document.createElement("div");
    const { chart, controller } = createController({
      networkChartElement: chartElement,
    });
    controller.setNetworkPaneElement(paneElement);
    controller.setNetworkScrollerElement(scrollerElement);
    controller.renderNetworkChart();
    await flushPromises();

    expect(resizeObserverInstances).toHaveLength(1);
    expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(chartElement);
    expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(paneElement);
    expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(scrollerElement);

    chart.resize.mockClear();
    resizeObserverInstances[0].callback();

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
    expect(chart.resize).toHaveBeenCalledTimes(1);

    controller.disposeNetworkChart();
    expect(resizeObserverInstances[0].disconnect).toHaveBeenCalled();
  });

  it("downloads, toggles mobile fullscreen, and disposes chart resources", async () => {
    const { chart, controller, element } = createController({ isMobile: true });
    const pane = document.createElement("div");
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const created = document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
      if (tagName === "a") {
        Object.defineProperty(created, "click", { value: click });
      }
      return created as HTMLElement;
    });

    controller.setNetworkPaneElement(pane);
    controller.renderNetworkChart();
    await flushPromises();

    controller.downloadNetworkChart();
    expect(chart.getDataURL).toHaveBeenCalledWith({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "color:background",
    });
    expect(click).toHaveBeenCalled();

    await controller.enterFullscreen();
    expect(pane.classList.contains("network-graph-pane--app-fullscreen")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    controller.disposeNetworkChart();
    expect(pane.classList.contains("network-graph-pane--app-fullscreen")).toBe(false);
    expect(chart.dispose).toHaveBeenCalled();
    expect(element).toBe(controller.networkChartRef.value);
  });

  it("handles native context menu and desktop fullscreen branches", async () => {
    const firstElement = document.createElement("div");
    const secondElement = document.createElement("div");
    const { chart, controller } = createController({
      isMobile: true,
      networkChartElement: firstElement,
    });
    const mobileContextMenu = new Event("contextmenu", { cancelable: true });
    firstElement.dispatchEvent(mobileContextMenu);
    expect(mobileContextMenu.defaultPrevented).toBe(true);

    controller.setNetworkChartElement(secondElement);
    const oldContextMenu = new Event("contextmenu", { cancelable: true });
    firstElement.dispatchEvent(oldContextMenu);
    expect(oldContextMenu.defaultPrevented).toBe(false);

    const desktop = createController({ isMobile: false });
    const pane = document.createElement("div");
    const requestFullscreen = vi.fn();
    const exitFullscreen = vi.fn();
    Object.defineProperty(pane, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreen,
    });
    desktop.controller.setNetworkPaneElement(pane);

    await desktop.controller.enterFullscreen();
    expect(requestFullscreen).toHaveBeenCalled();

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: pane,
    });
    await desktop.controller.enterFullscreen();
    expect(exitFullscreen).toHaveBeenCalled();

    controller.disposeNetworkChart();
    expect(chart.dispose).not.toHaveBeenCalled();
  });
});
