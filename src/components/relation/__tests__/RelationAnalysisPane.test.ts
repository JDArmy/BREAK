import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import RelationAnalysisPane from "@/components/relation/RelationAnalysisPane.vue";
import { createRelationTypeMapping, RelationType } from "@/views/relation/relationTypes";
import type {
  AttackPathDetail,
  AttackPathFilterOption,
  AttackPathFilterType,
  AttackPathFilters,
  RiskAvoidanceCoverage,
} from "@/views/relation/relationTypes";
import type {
  NodeSpecialInsightSummary,
  RootRelationSummary,
} from "@/components/relation/relationNodeDrawerInsightTypes";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

const mocks = vi.hoisted(() => ({
  isMobile: false,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock("@/composables/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: mocks.isMobile }),
}));

const filterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]> = {
  [RelationType.threatActor]: [
    { key: "TA0001", label: "组织", count: 2 },
  ],
  [RelationType.attackTool]: [
    { key: "AT0001", label: "工具", count: 3 },
  ],
  [RelationType.risk]: [{ key: "R0001", label: "风险", count: 4 }],
  [RelationType.avoidance]: [
    { key: "A0001", label: "规避", count: 5 },
  ],
};

const coverage: RiskAvoidanceCoverage = {
  totalCount: 2,
  directCount: 1,
  attackToolCount: 1,
  overlapCount: 0,
  items: [
    {
      avoidanceKey: "A0001",
      avoidanceTitle: "验证码",
      source: "risk",
      sourceLabel: "直接",
      pathCount: 2,
      attackToolLabels: ["工具一"],
      sourceFields: ["Risk.avoidances"],
    },
    {
      avoidanceKey: "A0002",
      avoidanceTitle: "限流",
      source: "attackTool",
      sourceLabel: "工具",
      pathCount: 1,
      attackToolLabels: [],
      sourceFields: ["AttackTool.avoidances"],
    },
  ],
};

const pathDetail = (id: string): AttackPathDetail => ({
  id,
  label: `路径 ${id}`,
  nodes: [
    { type: RelationType.threatActor, key: "TA0001", label: "组织" },
    { type: RelationType.attackTool, key: "AT0001", label: "工具" },
    { type: RelationType.risk, key: "R0001", label: "风险" },
  ],
  segments: [
    {
      source: { type: RelationType.threatActor, key: "TA0001", label: "组织" },
      target: { type: RelationType.attackTool, key: "AT0001", label: "工具" },
      relation: "使用",
      reason: "路径原因",
      sourceFields: ["ThreatActor.useAttackTools"],
    },
  ],
});

const specialInsight: NodeSpecialInsightSummary = {
  title: "专项洞察",
  summary: "专项摘要",
  severity: "normal",
  sections: [
    {
      title: "覆盖质量",
      summary: "覆盖摘要",
      metrics: [{ label: "风险", value: 1 }],
      items: [
        {
          id: "AT0001",
          title: "攻击工具",
          type: RelationType.attackTool,
          meta: "工具链路",
          sourceFields: ["AttackTool.avoidances"],
        },
      ],
    },
  ],
  recommendation: "建议",
};

const rootRelation: RootRelationSummary = {
  relationKey: "root:R0001",
  direction: "outgoing",
  text: "关联",
  otherNodeId: "A0001",
  otherNodeType: RelationType.avoidance,
  otherNodeTitle: "验证码",
  sourceFields: ["Risk.avoidances"],
};

interface MockViewModelOptions {
  activeView?: string;
  attackPathDetails?: AttackPathDetail[];
  attackPathFilters?: AttackPathFilters;
  hasActiveAttackPathFilters?: boolean;
  riskAvoidanceCoverage?: RiskAvoidanceCoverage | null;
  selectedAttackPathDetail?: AttackPathDetail | null;
  selectedNetworkNode?: { id: string; type: string } | null;
  selectedNodeSpecialInsightSummary?: NodeSpecialInsightSummary | null;
  rootNodeRelations?: RootRelationSummary[];
  filteredAttackPaths?: AttackPathDetail[];
  selectedNetworkNodeTitle?: string;
  relKey?: string;
}

/** 构造 mock viewModel（含 RelationAnalysisPane 所需的 ref/computed/方法/对象） */
const createMockViewModel = (options: MockViewModelOptions = {}) => {
  const attackPathDetails = options.attackPathDetails ?? [pathDetail("p1"), pathDetail("p2")];
  const attackPathFilters = ref<AttackPathFilters>(
    options.attackPathFilters ?? ({} as AttackPathFilters),
  );
  // 仅在字段显式传入（含 null）时采用入参，否则回退默认值
  const hasRiskCoverage =
    Object.prototype.hasOwnProperty.call(options, "riskAvoidanceCoverage");
  const hasSpecialInsight = Object.prototype.hasOwnProperty.call(
    options,
    "selectedNodeSpecialInsightSummary",
  );
  const hasSelectedAttackPathDetail = Object.prototype.hasOwnProperty.call(
    options,
    "selectedAttackPathDetail",
  );
  const hasSelectedNetworkNode = Object.prototype.hasOwnProperty.call(
    options,
    "selectedNetworkNode",
  );
  const hasRootNodeRelations = Object.prototype.hasOwnProperty.call(
    options,
    "rootNodeRelations",
  );
  return {
    // ref 类字段
    activeView: ref<string>(options.activeView ?? "analysis"),
    attackPathDetails: ref<AttackPathDetail[]>(attackPathDetails),
    attackPathFilterOptions: ref<Record<AttackPathFilterType, AttackPathFilterOption[]>>(
      filterOptions,
    ),
    attackPathFilters,
    filteredAttackPaths: ref<AttackPathDetail[]>(
      options.filteredAttackPaths ?? attackPathDetails,
    ),
    hasActiveAttackPathFilters: computed(
      () => options.hasActiveAttackPathFilters ?? false,
    ),
    riskAvoidanceCoverage: ref<RiskAvoidanceCoverage | null>(
      hasRiskCoverage ? options.riskAvoidanceCoverage! : coverage,
    ),
    selectedAttackPathDetail: ref<AttackPathDetail | null>(
      hasSelectedAttackPathDetail ? options.selectedAttackPathDetail! : pathDetail("p1"),
    ),
    selectedNetworkNode: ref<{ id: string; type: string } | null>(
      hasSelectedNetworkNode
        ? options.selectedNetworkNode!
        : { id: "R0001", type: RelationType.risk },
    ),
    selectedNodeAnalysisSummary: ref<unknown>(null),
    selectedNodeRelatedEntitySummary: ref<unknown>(null),
    selectedNodeAttackPathSummary: ref<string[]>([]),
    selectedNodeAttackPathDescription: ref<string>(""),
    selectedNodeAttackPathExplanations: ref<unknown[]>([]),
    selectedNodeBusinessSceneImpactSummary: ref<unknown>(null),
    selectedNodeCoverageSummary: ref<unknown>(null),
    selectedNodeSpecialInsightSummary: ref<NodeSpecialInsightSummary | null>(
      hasSpecialInsight ? options.selectedNodeSpecialInsightSummary! : null,
    ),
    selectedNetworkNodeTitle: ref<string>(
      options.selectedNetworkNodeTitle ?? "流程自动化",
    ),
    selectedNetworkRelationCounts: ref<{ incoming: number; outgoing: number }>({
      incoming: 1,
      outgoing: 2,
    }),
    selectedNetworkRelations: ref<unknown[]>([]),
    rootNodeRelations: ref<RootRelationSummary[]>(
      hasRootNodeRelations ? options.rootNodeRelations! : [rootRelation],
    ),
    selectedNodeRootPath: ref<unknown>(null),
    relKey: ref<string>(options.relKey ?? "R0001"),
    drawerCopyFeedbackMessage: ref<string>(""),
    drawerCopyFeedbackType: ref<"success" | "error">("success"),
    isCurrentNodeRoot: computed(() => true),
    // 普通对象
    RelationTypeMapping: createRelationTypeMapping((key: string) => key, () => "#000"),
    // 方法（vi.fn() 便于断言被调用）
    getNodeTypeTitle: vi.fn((type: string) => type),
    isPathNodeCurrentSelection: vi.fn(() => false),
    isRelationOnSelectedPath: vi.fn(() => false),
    copySelectedNodeCsv: vi.fn(),
    gotoSelectedNodeDetailView: vi.fn(),
    openSelectedNodeDetailInNewWindow: vi.fn(),
    openSelectedNodeAsRoot: vi.fn(),
    // resetAttackPathFilters 清空 filters ref，模拟真实 viewModel 行为
    resetAttackPathFilters: vi.fn(() => {
      attackPathFilters.value = {} as AttackPathFilters;
    }),
    selectAttackPath: vi.fn(),
    focusNodeInDrawer: vi.fn(),
    openNodeAsRootById: vi.fn(),
    gotoNodeDetailViewById: vi.fn(),
  };
};

const selectStub = {
  props: ["modelValue"],
  emits: ["update:modelValue"],
  methods: {
    emitValue(event: Event) {
      this.$emit("update:modelValue", (event.target as HTMLSelectElement).value);
    },
  },
  template:
    '<select class="select-stub" :value="modelValue" @change="emitValue"><slot /></select>',
};

const optionStub = {
  props: ["label", "value"],
  template: '<option :value="value">{{ label }}</option>',
};

const detailContentStub = {
  props: [
    "selectedNetworkNode",
    "selectedNetworkNodeTitle",
    "showRootRelationBlock",
    "showCoverageBlock",
    "showAttackPathBlock",
    "showOpenAsRootAction",
  ],
  emits: [
    "copy-csv",
    "view-detail",
    "open-detail-new-window",
    "open-as-root",
    "update:attack-path-filters",
    "reset-attack-path-filters",
    "focus-node",
    "open-node-as-root",
    "open-node-detail",
  ],
  template: `
    <div class="detail-content-stub">
      <span>{{ selectedNetworkNode.id }} {{ selectedNetworkNodeTitle }}</span>
      <span class="detail-flags">{{ showRootRelationBlock }} {{ showCoverageBlock }} {{ showAttackPathBlock }} {{ showOpenAsRootAction }}</span>
      <button class="copy-csv" @click="$emit('copy-csv')">copy</button>
      <button class="view-detail" @click="$emit('view-detail')">view</button>
      <button class="open-new" @click="$emit('open-detail-new-window')">new</button>
      <button class="open-root" @click="$emit('open-as-root')">root</button>
      <button class="update-filter" @click="$emit('update:attack-path-filters', { risk: 'R0001' })">filter</button>
      <button class="reset-filter" @click="$emit('reset-attack-path-filters')">reset</button>
      <button class="focus-node" @click="$emit('focus-node', selectedNetworkNode.id)">focus</button>
      <button class="open-node-root" @click="$emit('open-node-as-root', selectedNetworkNode.id)">node root</button>
      <button class="open-node-detail" @click="$emit('open-node-detail', selectedNetworkNode.id)">node detail</button>
    </div>
  `,
};

const backtopStub = {
  props: ["target", "title", "ariaLabel"],
  template:
    '<div class="backtop-stub" :data-target="target" :title="title" :aria-label="ariaLabel" />',
};

const buttonStub = {
  template: '<button class="el-button"><slot /></button>',
};

const mountPane = (options: MockViewModelOptions = {}) => {
  const viewModel = createMockViewModel(options);
  const wrapper = mount(RelationAnalysisPane, {
    global: {
      stubs: {
        ElBacktop: backtopStub,
        ElButton: buttonStub,
        ElOption: optionStub,
        ElSelect: selectStub,
        RelationNodeDetailContent: detailContentStub,
      },
      provide: {
        [RELATION_VIEW_MODEL_KEY as symbol]: viewModel,
      },
    },
  });
  return { wrapper, viewModel };
};

afterEach(() => {
  mocks.isMobile = false;
});

describe("RelationAnalysisPane", () => {
  it("非激活状态不渲染分析面板", () => {
    // activeView !== 'analysis' 时组件内 active computed 为 false
    const { wrapper } = mountPane({ activeView: "network" });

    expect(wrapper.find(".relation-analysis-pane").exists()).toBe(false);
  });

  it("没有分析数据时显示空态", () => {
    const { wrapper } = mountPane({
      attackPathDetails: [],
      riskAvoidanceCoverage: null,
      selectedAttackPathDetail: null,
      selectedNetworkNode: null,
      selectedNodeSpecialInsightSummary: null,
      rootNodeRelations: [],
    });

    expect(wrapper.text()).toContain("relationView.noAnalysis");
  });

  it("渲染三列分析内容并转发筛选和路径事件", async () => {
    const { wrapper, viewModel } = mountPane({
      attackPathFilters: { [RelationType.avoidance]: "A0001" },
      hasActiveAttackPathFilters: true,
    });

    expect(wrapper.text()).toContain("relationView.coverageMode");
    expect(wrapper.text()).toContain("验证码");
    expect(wrapper.text()).toContain("路径 p1");
    expect(wrapper.text()).toContain("流程自动化");
    expect(wrapper.find(".detail-flags").text()).toBe("false false false false");

    // 选择威胁行为者筛选 → 直接写 viewModel.attackPathFilters（不再 emit update:attack-path-filters）
    await wrapper.findAll(".select-stub")[0].setValue("TA0001");
    expect(viewModel.attackPathFilters.value).toEqual({
      [RelationType.avoidance]: "A0001",
      [RelationType.threatActor]: "TA0001",
    });

    // 点击重置按钮 → 调 viewModel.resetAttackPathFilters
    await wrapper.find(".relation-analysis-filter-summary .el-button").trigger("click");
    expect(viewModel.resetAttackPathFilters).toHaveBeenCalledTimes(1);

    // 点击覆盖项 → 在 attackPathFilters 上叠加 avoidance 筛选（不再 emit apply-avoidance-filter）
    await wrapper.find(".relation-analysis-coverage-item").trigger("click");
    expect(viewModel.attackPathFilters.value).toEqual({
      [RelationType.avoidance]: "A0001",
    });

    // 点击路径列表第二项 → 调 viewModel.selectAttackPath("p2")
    await wrapper.findAll(".relation-analysis-path-list-item")[1].trigger("click");
    expect(viewModel.selectAttackPath).toHaveBeenCalledWith("p2");
  });

  it("没有覆盖数据时渲染专项洞察并应用洞察筛选", async () => {
    const { wrapper, viewModel } = mountPane({
      riskAvoidanceCoverage: null,
      selectedNodeSpecialInsightSummary: specialInsight,
    });

    expect(wrapper.text()).toContain("专项洞察");
    await wrapper.find(".node-special-insight-item").trigger("click");

    // 专项洞察点击 → 直接写 viewModel.attackPathFilters 为 {attackTool: "AT0001"}
    expect(viewModel.attackPathFilters.value).toEqual({
      [RelationType.attackTool]: "AT0001",
    });
  });

  it("移动端限制覆盖和路径列表并支持展开/折叠", async () => {
    mocks.isMobile = true;
    const manyCoverage: RiskAvoidanceCoverage = {
      ...coverage,
      items: Array.from({ length: 8 }, (_, index) => ({
        ...coverage.items[0],
        avoidanceKey: `A_MOBILE_${index}`,
        avoidanceTitle: `移动覆盖 ${index}`,
      })),
    };
    const manyPaths = Array.from({ length: 10 }, (_, index) =>
      pathDetail(`mobile-${index}`),
    );
    const { wrapper } = mountPane({
      attackPathDetails: manyPaths,
      riskAvoidanceCoverage: manyCoverage,
    });

    expect(wrapper.findAll(".relation-analysis-coverage-item")).toHaveLength(6);
    expect(wrapper.findAll(".relation-analysis-path-list-item")).toHaveLength(8);
    expect(wrapper.text()).toContain("relationView.hiddenAnalysisCoverageCount");
    expect(wrapper.text()).toContain("relationView.hiddenAnalysisPathCount");

    await wrapper.findAll(".node-attack-path-more-button")[0].trigger("click");
    await wrapper.findAll(".node-attack-path-more-button")[1].trigger("click");
    expect(wrapper.findAll(".relation-analysis-coverage-item")).toHaveLength(8);
    expect(wrapper.findAll(".relation-analysis-path-list-item")).toHaveLength(10);

    await wrapper.findAll(".node-attack-path-more-button")[0].trigger("click");
    await wrapper.findAll(".node-attack-path-more-button")[1].trigger("click");
    expect(wrapper.findAll(".relation-analysis-coverage-item")).toHaveLength(6);
    expect(wrapper.findAll(".relation-analysis-path-list-item")).toHaveLength(8);
  });

  it("PC 端默认只展示 10 条覆盖和路径，点击更多后展示剩余数据", async () => {
    const manyCoverage: RiskAvoidanceCoverage = {
      ...coverage,
      items: Array.from({ length: 12 }, (_, index) => ({
        ...coverage.items[0],
        avoidanceKey: `A_PC_${index}`,
        avoidanceTitle: `桌面覆盖 ${index}`,
      })),
    };
    const manyPaths = Array.from({ length: 13 }, (_, index) =>
      pathDetail(`desktop-${index}`),
    );
    const { wrapper } = mountPane({
      attackPathDetails: manyPaths,
      riskAvoidanceCoverage: manyCoverage,
    });

    expect(wrapper.findAll(".relation-analysis-coverage-item")).toHaveLength(10);
    expect(wrapper.findAll(".relation-analysis-path-list-item")).toHaveLength(10);

    await wrapper.findAll(".node-attack-path-more-button")[0].trigger("click");
    await wrapper.findAll(".node-attack-path-more-button")[1].trigger("click");

    expect(wrapper.findAll(".relation-analysis-coverage-item")).toHaveLength(12);
    expect(wrapper.findAll(".relation-analysis-path-list-item")).toHaveLength(13);
  });

  it("右侧详情内容事件应该继续向外转发", async () => {
    const { wrapper, viewModel } = mountPane();

    await wrapper.find(".copy-csv").trigger("click");
    await wrapper.find(".view-detail").trigger("click");
    await wrapper.find(".open-new").trigger("click");
    await wrapper.find(".open-root").trigger("click");
    // update-filter → 写 viewModel.attackPathFilters 为 {risk: "R0001"}
    await wrapper.find(".update-filter").trigger("click");
    expect(viewModel.attackPathFilters.value).toEqual({ risk: "R0001" });

    // reset-filter → 调 resetAttackPathFilters 清空 filters
    await wrapper.find(".reset-filter").trigger("click");
    await wrapper.find(".focus-node").trigger("click");
    await wrapper.find(".open-node-root").trigger("click");
    await wrapper.find(".open-node-detail").trigger("click");

    // 各按钮 → 调对应 viewModel 方法（不再 emit 到外层）
    expect(viewModel.copySelectedNodeCsv).toHaveBeenCalledTimes(1);
    expect(viewModel.gotoSelectedNodeDetailView).toHaveBeenCalledTimes(1);
    expect(viewModel.openSelectedNodeDetailInNewWindow).toHaveBeenCalledTimes(1);
    expect(viewModel.openSelectedNodeAsRoot).toHaveBeenCalledTimes(1);
    expect(viewModel.resetAttackPathFilters).toHaveBeenCalledTimes(1);
    expect(viewModel.focusNodeInDrawer).toHaveBeenCalledWith("R0001");
    expect(viewModel.openNodeAsRootById).toHaveBeenCalledWith("R0001");
    expect(viewModel.gotoNodeDetailViewById).toHaveBeenCalledWith("R0001");
  });
});
