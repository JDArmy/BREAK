import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { RelationType } from "@/views/relation/relationTypes";

const loadNetworkECharts = vi.fn(async () => ({}));
const loadSankeyECharts = vi.fn(async () => ({}));
vi.mock("@/views/relation/relationECharts", () => ({
  loadNetworkECharts,
  loadSankeyECharts,
}));

const createViewModel = () => ({
  setRelationPageElement: vi.fn(),
  relType: ref(RelationType.risk),
  relKey: ref("R0001"),
  RelationTypeMapping: {},
  getCurrentEntityOptions: vi.fn(() => []),
  activeAnalysisPerspective: ref("risk"),
  currentAnalysisPerspectiveOption: computed(() => ({
    key: "risk",
    titleKey: "relationView.perspective.risk.title",
    descriptionKey: "relationView.perspective.risk.description",
    defaultView: "network",
    networkLayout: "horizontal",
    relationTypes: [RelationType.risk],
    lineTypes: ["relationLine.directCauseRisk"],
    showSubNode: true,
    showRelatedEntity: true,
  })),
  activeView: ref("network"),
  setNetworkPaneElement: vi.fn(),
  setNetworkScrollerElement: vi.fn(),
  setNetworkChartElement: vi.fn(),
  networkLayoutTooltip: ref(""),
  networkLayoutOptions: [],
  networkState: {},
  nodeFilterVisible: ref(false),
  lineFilterVisible: ref(false),
  filterRelationType: ref([]),
  filterSubNode: ref(true),
  filterRelatedEntity: ref(true),
  filterLineType: ref([]),
  relationTypeItems: ref([]),
  subNodeFilterColor: ref(""),
  visibleRelationLegendItems: ref([]),
  formatRelationFieldsTooltip: vi.fn(() => ""),
  selectedNetworkRelationDetail: ref(null),
  enterFullscreen: vi.fn(),
  zoomNetworkChart: vi.fn(),
  handleNetworkLayoutCommand: vi.fn(),
  refreshNetworkChart: vi.fn(),
  downloadNetworkChart: vi.fn(),
  toggleNodeFilter: vi.fn(),
  toggleLineFilter: vi.fn(),
  openNodeDetailDrawer: vi.fn(),
  doFilter: vi.fn(),
  closeNetworkRelationDetail: vi.fn(),
  sankeyHasData: ref(true),
  sankeyChartMinWidth: ref(900),
  setSankeyChartElement: vi.fn(),
  attackPathDetails: ref([]),
  attackPathFilterOptions: ref({}),
  attackPathFilters: ref({}),
  filteredAttackPaths: ref([]),
  hasActiveAttackPathFilters: computed(() => false),
  riskAvoidanceCoverage: ref([]),
  selectedAttackPathDetail: ref(null),
  selectedNetworkNode: ref(null),
  selectedNodeAnalysisSummary: ref(null),
  selectedNodeRelatedEntitySummary: ref(null),
  selectedNodeAttackPathSummary: ref(null),
  selectedNodeAttackPathDescription: ref(""),
  selectedNodeAttackPathExplanations: ref([]),
  selectedNodeBusinessSceneImpactSummary: ref(null),
  selectedNodeCoverageSummary: ref(null),
  selectedNodeSpecialInsightSummary: ref(null),
  selectedNetworkNodeTitle: computed(() => "R0001"),
  selectedNetworkRelationCounts: ref([]),
  selectedNetworkRelations: ref([]),
  rootNodeRelations: ref([]),
  selectedNodeRootPath: ref([]),
  getNodeTypeTitle: vi.fn((type: string) => type),
  isPathNodeCurrentSelection: vi.fn(() => false),
  isRelationOnSelectedPath: vi.fn(() => false),
  isCurrentNodeRoot: vi.fn(() => false),
  drawerCopyFeedbackMessage: ref(""),
  drawerCopyFeedbackType: ref("success"),
  copySelectedNodeCsv: vi.fn(),
  gotoSelectedNodeDetailView: vi.fn(),
  openSelectedNodeDetailInNewWindow: vi.fn(),
  openSelectedNodeAsRoot: vi.fn(),
  resetAttackPathFilters: vi.fn(),
  selectAttackPath: vi.fn(),
  focusNodeInDrawer: vi.fn(),
  openNodeAsRootById: vi.fn(),
  gotoNodeDetailViewById: vi.fn(),
  setDropdownInstance: vi.fn(),
  dropdownStyle: ref({}),
  disableContextMenuAll: computed(() => false),
  disableContextMenuOpenAsRoot: computed(() => false),
  clickContextMenu: vi.fn(),
  gotoNewRelationView: vi.fn(),
  openContextNodeDetailDrawer: vi.fn(),
  copyContextNodeCsv: vi.fn(),
  gotoItemDetailView: vi.fn(),
  touchActionVisible: ref(false),
  openTouchNodeDetailDrawer: vi.fn(),
  touchActionClose: vi.fn(),
  nodeDetailDrawerVisible: ref(false),
  // 路径探索
  pathExplorerSankeyData: ref({ nodes: [], links: [] }),
  pathExplorerHasData: ref(false),
  pathExplorerChartHeight: ref(0),
  pathExplorerStats: ref(null),
  hasTarget: ref(false),
  searching: ref(false),
  pathExplorerStartType: ref(RelationType.risk),
  pathExplorerStartKey: ref("R0001"),
  pathExplorerEndType: ref(RelationType.avoidance),
  pathExplorerEndKey: ref(""),
  pathExplorerMaxDepth: ref(4),
  pathExplorerMaxPaths: ref(10),
  pathExplorerSankeyController: {
    setSankeyChartElement: vi.fn(),
    renderSankeyChart: vi.fn(),
    resizeSankeyChart: vi.fn(),
    updateSankeyTheme: vi.fn(),
    disposeSankeyChart: vi.fn(),
    hideSankeyTooltip: vi.fn(),
    sankeyHasData: ref(false),
  },
});

let viewModel = createViewModel();

vi.mock("@/views/relation/useRelationViewModel", () => ({
  useRelationViewModel: () => viewModel,
}));

const mountRelationView = async () => {
  const RelationView = (await import("@/views/RelationView.vue")).default;
  return mount(RelationView, {
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        RelationSelectorBar: {
          // RelationSelectorBar 现通过 inject 取 viewModel，stub 简化显示固定文本
          //（createViewModel 初始 relType=risk, relKey=R0001，测试断言此值）
          template: '<div class="selector-stub">risk R0001</div>',
        },
        ElTabs: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template: '<section class="tabs-stub"><slot /></section>',
        },
        ElTabPane: {
          props: ["name", "label", "lazy"],
          template: '<section class="tab-pane-stub" :data-name="name"><slot /></section>',
        },
        RelationNetworkPane: {
          emits: ["open-node-detail", "fullscreen"],
          template: '<div class="network-pane-stub" @click="$emit(\'open-node-detail\', \'R0001\')">network</div>',
        },
        RelationSankeyPane: { template: '<div class="sankey-pane-stub">sankey</div>' },
        RelationAnalysisPane: { template: '<div class="analysis-pane-stub">analysis</div>' },
        RelationPathExplorerPane: { template: '<div class="path-explorer-pane-stub">path</div>' },
        RelationGraphContextMenu: { template: '<div class="context-menu-stub" />' },
        RelationGraphTouchActions: { template: '<div class="touch-actions-stub" />' },
        RelationNodeDetailDrawer: {
          props: ["modelValue", "selectedNetworkNodeTitle"],
          emits: ["update:modelValue", "copy-csv"],
          template: '<aside class="detail-drawer-stub">{{ selectedNetworkNodeTitle }}</aside>',
        },
      },
    },
  });
};

describe("RelationView", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    viewModel = createViewModel();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
  });

  it("挂载页面组合组件并在桌面空闲期预加载备用图表", async () => {
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 10 });
      return 7;
    });
    vi.stubGlobal("requestIdleCallback", requestIdleCallback);
    const wrapper = await mountRelationView();

    expect(wrapper.find(".selector-stub").text()).toContain("risk R0001");
    expect(wrapper.find(".network-pane-stub").exists()).toBe(true);
    expect(wrapper.find(".sankey-pane-stub").exists()).toBe(true);
    expect(requestIdleCallback).toHaveBeenCalled();
    expect(loadSankeyECharts).toHaveBeenCalled();

    wrapper.unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("移动端延迟预加载并在卸载时清理 timer", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });
    const clearSpy = vi.spyOn(window, "clearTimeout");
    const wrapper = await mountRelationView();

    expect(loadSankeyECharts).not.toHaveBeenCalled();
    vi.advanceTimersByTime(12000);
    expect(loadSankeyECharts).toHaveBeenCalled();

    wrapper.unmount();
    expect(clearSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("按 view model 状态渲染详情抽屉并转发网络面板事件", async () => {
    viewModel.nodeDetailDrawerVisible.value = true;
    const wrapper = await mountRelationView();

    expect(wrapper.find(".detail-drawer-stub").text()).toContain("R0001");
    await wrapper.find(".network-pane-stub").trigger("click");

    expect(viewModel.openNodeDetailDrawer).toHaveBeenCalledWith("R0001");
    vi.useRealTimers();
  });
});
