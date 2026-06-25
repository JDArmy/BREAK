import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, reactive, ref } from "vue";
import { createRelationViewAssembly } from "../relationViewAssembly";
import { RelationType, type SankeyNode } from "../relationTypes";

const {
  createNetworkChartController,
  createNetworkDataHelpers,
  createRelationPathExplorerSankey,
  createRelationViewState,
  createSankeyChartController,
  setupRelationViewEffects,
  useRelationGraphData,
  useRelationNodeActions,
} = vi.hoisted(() => ({
  createNetworkChartController: vi.fn(),
  createNetworkDataHelpers: vi.fn(),
  createRelationPathExplorerSankey: vi.fn(),
  createRelationViewState: vi.fn(),
  createSankeyChartController: vi.fn(),
  setupRelationViewEffects: vi.fn(),
  useRelationGraphData: vi.fn(),
  useRelationNodeActions: vi.fn(),
}));

vi.mock("@/views/relation/relationNetworkLayout", () => ({
  createNetworkDataHelpers,
}));

vi.mock("@/views/relation/relationViewControllers", () => ({
  createNetworkChartController,
  createSankeyChartController,
}));

vi.mock("@/views/relation/relationPathExplorerSankey", () => ({
  createRelationPathExplorerSankey,
}));

vi.mock("@/views/relation/relationViewEffects", () => ({
  setupRelationViewEffects,
}));

vi.mock("@/views/relation/relationViewState", () => ({
  createRelationViewState,
}));

vi.mock("@/views/relation/useRelationGraphData", () => ({
  useRelationGraphData,
}));

vi.mock("@/views/relation/useRelationNodeActions", () => ({
  useRelationNodeActions,
}));

const route = reactive({
  params: { type: "risk", key: "R0001" },
  query: {} as Record<string, string>,
});
const router = { push: vi.fn(), replace: vi.fn() };
const t = (key: string) => `t:${key}`;
const locale = ref("zh-CN");
const isDark = ref(false);
const isMobile = ref(false);
const width = ref(1280);
const dropdown1 = ref();
const setDropdownInstance = vi.fn();
const renderNetworkChartBridge = { current: vi.fn() };
const networkInteractionsBridge = {
  handleNodeTouch: vi.fn(),
  nodeClick: vi.fn(),
  openNodeDetail: vi.fn(),
  openRelationDetail: vi.fn(),
};
const relationMapping = {
  risk: { color: "#ef4444" },
  avoidance: { color: "#22c55e" },
  "attack-tool": { color: "#3b82f6" },
  "threat-actor": { color: "#a855f7" },
  term: { color: "#f59e0b" },
};

const createState = () => ({
  activeAnalysisPerspective: ref("risk"),
  activeView: ref("network"),
  handleNetworkLayoutCommand: vi.fn(),
  networkLayoutTooltip: computed(() => "布局"),
  networkState: { zoom: 1, layout: "horizontal" },
  refreshNetworkChart: vi.fn(),
  relKey: ref("R0001"),
  relType: ref(RelationType.risk),
  sankeyBottom: computed(() => 24),
  sankeyChartMinWidth: computed(() => 0),
  sankeyLabelFontSize: computed(() => 13),
  sankeyLabelLineHeight: computed(() => 17),
  sankeyLabelOverflow: computed(() => "truncate"),
  sankeyLabelWidth: computed(() => 220),
  sankeyLayoutIterations: computed(() => 48),
  sankeyLeft: computed(() => 40),
  sankeyNodeAlign: computed(() => "justify"),
  sankeyNodeGap: computed(() => 10),
  sankeyNodeWidth: computed(() => 18),
  sankeyRight: computed(() => 280),
  sankeyTop: computed(() => 24),
  setClearDraggedNodePositions: vi.fn(),
  zoomNetworkChart: vi.fn(),
  pathExplorerStartType: ref(RelationType.risk),
  pathExplorerStartKey: ref("R0001"),
  pathExplorerEndType: ref(RelationType.avoidance),
  pathExplorerEndKey: ref(""),
  pathExplorerMaxDepth: ref(4),
  pathExplorerMaxPaths: ref(10),
});

const createGraphData = () => ({
  addRootNode: vi.fn(),
  buildNodeSummary: vi.fn(),
  clearDraggedNodePositions: vi.fn(),
  draggedNodePositions: ref({}),
  ensureRelationNode: vi.fn(),
  explainRelation: vi.fn(),
  filterLineType: ref("all"),
  filterRelatedEntity: ref("all"),
  filterRelationType: ref("all"),
  filterSubNode: ref("all"),
  findNodeById: vi.fn(),
  formatEvidenceLevel: vi.fn(),
  genNetworkGraphData: vi.fn(),
  getCurrentEntityOptions: vi.fn(),
  getNodeTypeTitle: vi.fn(),
  getRelationSourceFields: vi.fn(),
  isDirectRelationLine: vi.fn(),
  lines: ref([]),
  nodes: ref([]),
  normalizeAttackPathFilters: vi.fn(),
  rebuildGraphData: vi.fn(),
  refreshGraphAfterVisible: vi.fn(),
  relationLegendItems: computed(() => [
    { key: "relationLine.directCauseRisk" },
    { key: "relationLine.indirectSupportRisk" },
    { key: "relationLine.avoidanceMeans" },
    { key: "relationLine.avoidanceComplement" },
  ]),
  rootNodeRelations: ref([]),
  sankeyChartHeight: computed(() => 460),
  sankeyData: computed(() => ({ nodes: [], links: [] })),
  selectedNetworkNode: ref(null),
  selectedNetworkNodeId: ref("R0001"),
  selectedNodeRootPath: ref(null),
  isCurrentNodeRoot: ref(false),
  getNodeTitle: vi.fn(),
  wrapLabelText: vi.fn(),
});

const createNodeActions = () => ({
  doFilter: vi.fn(),
  focusNodeInDrawer: vi.fn(),
  handleGlobalPointerDown: vi.fn(),
  handleNodeTouch: vi.fn(),
  nodeClick: vi.fn(),
  prepareNodeActions: vi.fn((type: RelationType, key: string) => ({ id: key, type })),
});

const createPathExplorerData = () => ({
  discoveredPaths: ref([]),
  pathExplorerChartHeight: computed(() => 420),
  pathExplorerHasData: ref(false),
  pathExplorerIsCurrentNodeRoot: ref(false),
  pathExplorerNodeRootPath: ref(null),
  pathExplorerSankeyData: computed(() => ({ nodes: [], links: [] })),
});

describe("relationViewAssembly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params = { type: "risk", key: "R0001" };
    route.query = {};
    router.push.mockClear();
    router.replace.mockClear();
    isDark.value = false;
    isMobile.value = false;
    width.value = 1280;
    locale.value = "zh-CN";
    const state = createState();
    const graphData = createGraphData();
    const nodeActions = createNodeActions();

    createRelationViewState.mockReturnValue(state);
    useRelationGraphData.mockReturnValue(graphData);
    createNetworkDataHelpers.mockReturnValue({
      getVisibleNetworkData: vi.fn(() => ({ nodes: [], links: [] })),
      toContextNode: vi.fn((node: { id: string }) => ({ id: node.id, type: RelationType.risk })),
    });
    useRelationNodeActions.mockReturnValue(nodeActions);
    createNetworkChartController.mockReturnValue({
      disposeNetworkChart: vi.fn(),
      hideNetworkTooltip: vi.fn(),
      recreateNetworkChart: vi.fn(),
      renderNetworkChart: vi.fn(),
      resizeNetworkChart: vi.fn(),
      updateNetworkSelection: vi.fn(),
    });
    createSankeyChartController.mockReturnValue({
      disposeSankeyChart: vi.fn(),
      hideSankeyTooltip: vi.fn(),
      renderSankeyChart: vi.fn(),
      resizeSankeyChart: vi.fn(),
      sankeyHasData: ref(false),
      setSankeyChartElement: vi.fn(),
      updateSankeyTheme: vi.fn(),
    });
    createRelationPathExplorerSankey.mockReturnValue(createPathExplorerData());
  });

  const createAssembly = () =>
    createRelationViewAssembly({
      route: route as never,
      router: router as never,
      t,
      locale,
      isDark,
      isMobile,
      width,
      RelationTypeMapping: relationMapping as never,
      getGraphColor: vi.fn(() => "#111827"),
      getRelationLineColor: vi.fn(() => "#64748b"),
      renderNetworkChartBridge,
      dropdown1,
      setDropdownInstance,
      networkInteractionsBridge,
    });

  it("wires state, graph data, controllers, node actions, and effects", () => {
    const relationView = createAssembly();
    const state = createRelationViewState.mock.results[0].value;
    const graphData = useRelationGraphData.mock.results[0].value;
    const networkController = createNetworkChartController.mock.results[0].value;
    const sankeyController = createSankeyChartController.mock.results[0].value;

    expect(createRelationViewState).toHaveBeenCalledWith(
      expect.objectContaining({ route, t, isMobile, width, renderNetworkChartBridge }),
    );
    expect(useRelationGraphData).toHaveBeenCalledWith(
      expect.objectContaining({ locale, relType: state.relType, relKey: state.relKey }),
    );
    expect(createNetworkDataHelpers).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: graphData.lines,
        networkState: state.networkState,
        selectedNetworkNodeId: graphData.selectedNetworkNodeId,
      }),
    );
    expect(renderNetworkChartBridge.current).toBe(networkController.renderNetworkChart);
    expect(state.setClearDraggedNodePositions).toHaveBeenCalledWith(graphData.clearDraggedNodePositions);
    expect(setupRelationViewEffects).toHaveBeenCalledWith(
      expect.objectContaining({
        renderNetworkChart: networkController.renderNetworkChart,
        renderSankeyChart: sankeyController.renderSankeyChart,
        disposeNetworkChart: networkController.disposeNetworkChart,
        disposeSankeyChart: sankeyController.disposeSankeyChart,
      }),
    );
    expect(relationView.activeView).toBe(state.activeView);
    expect(relationView.activeAnalysisPerspective).toBe(state.activeAnalysisPerspective);
    expect(relationView.renderNetworkChart).toBe(networkController.renderNetworkChart);
    expect(relationView.renderSankeyChart).toBe(sankeyController.renderSankeyChart);
  });

  it("按任务型分析视角更新筛选、布局、默认视图和 URL 查询", async () => {
    const relationView = createAssembly();
    const state = createRelationViewState.mock.results[0].value;
    const graphData = useRelationGraphData.mock.results[0].value;
    const nodeActions = useRelationNodeActions.mock.results[0].value;

    state.activeAnalysisPerspective.value = "defenseCoverage";
    await nextTick();

    expect(graphData.filterRelationType.value).toEqual([
      RelationType.risk,
      RelationType.avoidance,
      RelationType.attackTool,
      RelationType.threatActor,
    ]);
    expect(graphData.filterSubNode.value).toBe(false);
    expect(graphData.filterRelatedEntity.value).toBe(true);
    expect(graphData.filterLineType.value).toEqual([
      "relationLine.avoidanceMeans",
      "relationLine.directCauseRisk",
      "relationLine.indirectSupportRisk",
      "relationLine.avoidanceComplement",
    ]);
    expect(state.handleNetworkLayoutCommand).toHaveBeenCalledWith("force");
    expect(state.activeView.value).toBe("analysis");
    expect(nodeActions.doFilter).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith({
      name: "relation",
      params: { type: RelationType.risk, key: "R0001" },
      query: { perspective: "defenseCoverage" },
    });
    expect(relationView.currentAnalysisPerspectiveOption.value.key).toBe(
      "defenseCoverage",
    );
  });

  it("切换主视图时同步任务型分析视角和预设筛选", async () => {
    const relationView = createAssembly();
    const state = createRelationViewState.mock.results[0].value;
    const graphData = useRelationGraphData.mock.results[0].value;

    state.activeView.value = "sankey";
    await nextTick();

    expect(state.activeAnalysisPerspective.value).toBe("attackPath");
    expect(graphData.filterRelationType.value).toEqual([
      RelationType.threatActor,
      RelationType.attackTool,
      RelationType.risk,
      RelationType.avoidance,
    ]);
    expect(graphData.filterSubNode.value).toBe(false);
    expect(graphData.filterRelatedEntity.value).toBe(false);
    expect(router.replace).toHaveBeenCalledWith({
      name: "relation",
      params: { type: RelationType.risk, key: "R0001" },
      query: { perspective: "attackPath" },
    });
    expect(relationView.currentAnalysisPerspectiveOption.value.key).toBe(
      "attackPath",
    );
  });

  it("路径探索视图不反向联动任务型分析视角", async () => {
    createAssembly();
    const state = createRelationViewState.mock.results[0].value;

    state.activeAnalysisPerspective.value = "risk";
    router.replace.mockClear();
    state.activeView.value = "pathExplorer";
    await nextTick();

    expect(state.activeAnalysisPerspective.value).toBe("risk");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("bridges network and Sankey interactions back to node actions", () => {
    const relationView = createAssembly();
    const nodeActions = useRelationNodeActions.mock.results[0].value;
    const sankeyOptions = createSankeyChartController.mock.calls[0][0];
    const relationLink = { source: "R0001", target: "A0001" };
    const sankeyNode: SankeyNode = {
      entityKey: "A0001",
      entityType: RelationType.avoidance,
      itemStyle: { color: "#22c55e" },
      name: "规避手段",
    };

    networkInteractionsBridge.handleNodeTouch({ id: "R0001" });
    expect(nodeActions.handleNodeTouch).toHaveBeenCalledWith({ id: "R0001" });

    networkInteractionsBridge.openNodeDetail({ id: "R0001" });
    expect(nodeActions.focusNodeInDrawer).toHaveBeenCalledWith("R0001");

    networkInteractionsBridge.openRelationDetail(relationLink);
    expect(relationView.selectedNetworkRelationDetail.value).toEqual(relationLink);
    relationView.closeNetworkRelationDetail();
    expect(relationView.selectedNetworkRelationDetail.value).toBeNull();

    const clickEvent = new MouseEvent("click");
    networkInteractionsBridge.nodeClick({ id: "R0002" }, clickEvent);
    expect(nodeActions.nodeClick).toHaveBeenCalledWith({ id: "R0002" }, clickEvent);

    sankeyOptions.onOpenNodeActions(sankeyNode, clickEvent);
    expect(nodeActions.prepareNodeActions).toHaveBeenCalledWith(RelationType.avoidance, "A0001");
    expect(nodeActions.nodeClick).toHaveBeenCalledWith(
      { id: "A0001", type: RelationType.avoidance },
      clickEvent,
    );

    sankeyOptions.onOpenNodeActions(sankeyNode);
    expect(nodeActions.handleNodeTouch).toHaveBeenCalledWith({
      id: "A0001",
      type: RelationType.avoidance,
    });

    sankeyOptions.onOpenNodeDetail(sankeyNode);
    expect(nodeActions.focusNodeInDrawer).toHaveBeenCalledWith("A0001");
  });

  it("stores the relation page element only for real div elements", () => {
    const relationView = createAssembly();
    const nodeActionOptions = useRelationNodeActions.mock.calls[0][0];
    const element = document.createElement("div");

    relationView.setRelationPageElement("not-element");
    expect(nodeActionOptions.contextMenuPaneRef.value).toBeUndefined();

    relationView.setRelationPageElement(element);
    expect(nodeActionOptions.contextMenuPaneRef.value).toBe(element);
  });

  it("configures path explorer Sankey spacing from discovered depth and mobile state", () => {
    createRelationPathExplorerSankey.mockReturnValue({
      discoveredPaths: ref([]),
      pathExplorerChartHeight: computed(() => 420),
      pathExplorerHasData: ref(true),
      pathExplorerSankeyData: computed(() => ({
        nodes: [
          { name: "d0", depth: 0 },
          { name: "d1", depth: 1 },
          { name: "d2", depth: 2 },
          { name: "d3", depth: 3 },
          { name: "d4", depth: 4 },
          { name: "d5", depth: 5 },
        ],
        links: [],
      })),
    });

    createAssembly();

    const pathExplorerOptions = createSankeyChartController.mock.calls[1][0];
    expect(pathExplorerOptions.viewModeKey).toBe("pathExplorer");
    expect(pathExplorerOptions.sankeyRight.value).toBe(160);
    expect(pathExplorerOptions.sankeyLabelWidth.value).toBe(140);
    expect(pathExplorerOptions.sankeyNodeGap.value).toBe(24);

    isMobile.value = true;
    expect(pathExplorerOptions.sankeyRight.value).toBe(200);
    expect(pathExplorerOptions.sankeyLabelWidth.value).toBe(220);
    expect(pathExplorerOptions.sankeyNodeGap.value).toBe(16);
    isMobile.value = false;
  });

  it("uses medium path explorer spacing for five discovered depths", () => {
    createRelationPathExplorerSankey.mockReturnValue({
      discoveredPaths: ref([]),
      pathExplorerChartHeight: computed(() => 420),
      pathExplorerHasData: ref(true),
      pathExplorerSankeyData: computed(() => ({
        nodes: [
          { name: "d0", depth: 0 },
          { name: "d1", depth: 1 },
          { name: "d2", depth: 2 },
          { name: "d3", depth: 3 },
          { name: "d4", depth: 4 },
        ],
        links: [],
      })),
    });

    createAssembly();

    const pathExplorerOptions = createSankeyChartController.mock.calls[1][0];
    expect(pathExplorerOptions.sankeyRight.value).toBe(200);
    expect(pathExplorerOptions.sankeyLabelWidth.value).toBe(160);
    expect(pathExplorerOptions.sankeyNodeGap.value).toBe(20);
  });

  it("renders path explorer Sankey only when active view has data", async () => {
    const discoveredPaths = ref<string[]>([]);
    const pathExplorerHasData = ref(false);
    createRelationPathExplorerSankey.mockReturnValue({
      discoveredPaths,
      pathExplorerChartHeight: computed(() => 420),
      pathExplorerHasData,
      pathExplorerSankeyData: computed(() => ({ nodes: [], links: [] })),
    });
    const relationView = createAssembly();
    const pathExplorerController = createSankeyChartController.mock.results[1].value;

    discoveredPaths.value = ["p1"];
    await nextTick();
    await nextTick();
    expect(pathExplorerController.renderSankeyChart).not.toHaveBeenCalled();

    relationView.activeView.value = "pathExplorer";
    pathExplorerHasData.value = true;
    discoveredPaths.value = ["p1", "p2"];
    await nextTick();
    await nextTick();

    expect(pathExplorerController.renderSankeyChart).toHaveBeenCalled();
  });

  it("syncs path explorer parameter changes into route query", async () => {
    const relationView = createAssembly();
    router.replace.mockClear();

    relationView.pathExplorerEndType.value = RelationType.threatActor;
    relationView.pathExplorerEndKey.value = "TA0001";
    relationView.pathExplorerMaxDepth.value = 6;
    relationView.pathExplorerMaxPaths.value = 20;
    await nextTick();

    expect(router.replace).toHaveBeenCalledWith({
      name: "relation",
      params: { type: RelationType.risk, key: "R0001" },
      query: {
        endType: RelationType.threatActor,
        endKey: "TA0001",
        maxDepth: "6",
        maxPaths: "20",
      },
    });

    router.replace.mockClear();
    relationView.pathExplorerEndKey.value = "";
    await nextTick();

    expect(router.replace).toHaveBeenCalledWith({
      name: "relation",
      params: { type: RelationType.risk, key: "R0001" },
      query: {
        endType: RelationType.threatActor,
        maxDepth: "6",
        maxPaths: "20",
      },
    });
  });

  it("does not replace route when path explorer parameters match query defaults", async () => {
    route.query = {
      endType: RelationType.avoidance,
      maxDepth: "4",
      maxPaths: "10",
    };
    const relationView = createAssembly();
    await nextTick();
    router.replace.mockClear();

    relationView.pathExplorerEndType.value = RelationType.avoidance;
    relationView.pathExplorerEndKey.value = "";
    relationView.pathExplorerMaxDepth.value = 4;
    relationView.pathExplorerMaxPaths.value = 10;
    await nextTick();

    expect(router.replace).not.toHaveBeenCalled();
  });

  it("applies valid path explorer query values with numeric clamping", async () => {
    const relationView = createAssembly();

    route.query = {
      endType: RelationType.term,
      endKey: "T0001",
      maxDepth: "99",
      maxPaths: "0",
    };
    await nextTick();

    expect(relationView.pathExplorerEndType.value).toBe(RelationType.term);
    expect(relationView.pathExplorerEndKey.value).toBe("T0001");
    expect(relationView.pathExplorerMaxDepth.value).toBe(6);
    expect(relationView.pathExplorerMaxPaths.value).toBe(10);

    route.query = {
      endType: "invalid",
      maxDepth: "abc",
      maxPaths: "31",
    };
    await nextTick();

    expect(relationView.pathExplorerEndType.value).toBe(RelationType.term);
    expect(relationView.pathExplorerEndKey.value).toBe("");
    expect(relationView.pathExplorerMaxDepth.value).toBe(4);
    expect(relationView.pathExplorerMaxPaths.value).toBe(30);
  });
});
