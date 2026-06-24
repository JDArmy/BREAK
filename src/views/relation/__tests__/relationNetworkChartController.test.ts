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
  isDark?: boolean;
  isMobile?: boolean;
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
    networkState: { zoom: 1.25, layout: "horizontal" },
    selectedNetworkNodeId,
    draggedNodePositions,
    getVisibleNetworkData: () => ({ nodes: [node, linkedNode], links: [link] }),
    getGraphColor: (key) => `color:${key}`,
    toContextNode: (graphNode) => ({ id: graphNode.id, type: graphNode.type }),
    getDownloadFilename: () => "relation-test.png",
    interactionsBridge,
  });

  const element = document.createElement("div");
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

describe("relationNetworkChartController", () => {
  beforeEach(() => {
    loadNetworkECharts.mockReset();
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
            zoom: 1.25,
          }),
        ],
      }),
      { notMerge: true, lazyUpdate: false }
    );
    expect(chart.dispatchAction).toHaveBeenCalledWith({ type: "hideTip" });
    expect(chart.resize).toHaveBeenCalled();
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
});
