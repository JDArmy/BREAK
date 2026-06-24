import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
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

const baseProps = {
  active: true,
  relationTypeMapping: createRelationTypeMapping((key: string) => key, () => "#000"),
  attackPathDetails: [pathDetail("p1"), pathDetail("p2")],
  selectedNetworkNode: { id: "R0001", type: RelationType.risk },
  attackPathFilterOptions: filterOptions,
  attackPathFilters: {} as AttackPathFilters,
  filteredAttackPathCount: 2,
  hasActiveAttackPathFilters: false,
  riskAvoidanceCoverage: coverage,
  selectedAttackPathDetail: pathDetail("p1"),
  selectedNodeAnalysisSummary: null,
  selectedNodeRelatedEntitySummary: null,
  selectedNodeAttackPathSummary: [],
  selectedNodeAttackPathDescription: "",
  selectedNodeAttackPathExplanations: [],
  selectedNodeBusinessSceneImpactSummary: null,
  selectedNodeCoverageSummary: null,
  selectedNodeSpecialInsightSummary: null,
  selectedNetworkNodeTitle: "流程自动化",
  selectedNetworkRelationCounts: { incoming: 1, outgoing: 2 },
  selectedNetworkRelations: [],
  rootNodeRelations: [rootRelation],
  selectedNodeRootPath: null,
  relKey: "R0001",
  getNodeTypeTitle: (type: string) => type,
  isPathNodeCurrentSelection: () => false,
  isRelationOnSelectedPath: () => false,
  isCurrentNodeRoot: true,
  drawerCopyFeedbackMessage: "",
  drawerCopyFeedbackType: "success" as const,
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

const mountPane = (
  props: Partial<InstanceType<typeof RelationAnalysisPane>["$props"]> = {},
) =>
  mount(RelationAnalysisPane, {
    props: {
      ...baseProps,
      ...props,
    },
    global: {
      stubs: {
        ElBacktop: backtopStub,
        ElButton: buttonStub,
        ElOption: optionStub,
        ElSelect: selectStub,
        RelationNodeDetailContent: detailContentStub,
      },
    },
  });

afterEach(() => {
  mocks.isMobile = false;
});

describe("RelationAnalysisPane", () => {
  it("非激活状态不渲染分析面板", () => {
    const wrapper = mountPane({ active: false });

    expect(wrapper.find(".relation-analysis-pane").exists()).toBe(false);
  });

  it("没有分析数据时显示空态", () => {
    const wrapper = mountPane({
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
    const wrapper = mountPane({
      attackPathFilters: { [RelationType.avoidance]: "A0001" },
      hasActiveAttackPathFilters: true,
    });

    expect(wrapper.text()).toContain("relationView.coverageMode");
    expect(wrapper.text()).toContain("验证码");
    expect(wrapper.text()).toContain("路径 p1");
    expect(wrapper.text()).toContain("流程自动化");
    expect(wrapper.find(".detail-flags").text()).toBe("false false false false");

    await wrapper.findAll(".select-stub")[0].setValue("TA0001");
    expect(wrapper.emitted("update:attack-path-filters")?.at(-1)).toEqual([
      { [RelationType.avoidance]: "A0001", [RelationType.threatActor]: "TA0001" },
    ]);

    await wrapper.find(".relation-analysis-filter-summary .el-button").trigger("click");
    expect(wrapper.emitted("reset-attack-path-filters")).toHaveLength(1);

    await wrapper.find(".relation-analysis-coverage-item").trigger("click");
    expect(wrapper.emitted("apply-avoidance-filter")?.[0]).toEqual(["A0001"]);

    await wrapper.findAll(".relation-analysis-path-list-item")[1].trigger("click");
    expect(wrapper.emitted("select-attack-path")?.[0]).toEqual(["p2"]);
  });

  it("没有覆盖数据时渲染专项洞察并应用洞察筛选", async () => {
    const wrapper = mountPane({
      riskAvoidanceCoverage: null,
      selectedNodeSpecialInsightSummary: specialInsight,
    });

    expect(wrapper.text()).toContain("专项洞察");
    await wrapper.find(".node-special-insight-item").trigger("click");

    expect(wrapper.emitted("update:attack-path-filters")?.[0]).toEqual([
      { [RelationType.attackTool]: "AT0001" },
    ]);
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
    const wrapper = mountPane({
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
    const wrapper = mountPane({
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
    const wrapper = mountPane();

    await wrapper.find(".copy-csv").trigger("click");
    await wrapper.find(".view-detail").trigger("click");
    await wrapper.find(".open-new").trigger("click");
    await wrapper.find(".open-root").trigger("click");
    await wrapper.find(".update-filter").trigger("click");
    await wrapper.find(".reset-filter").trigger("click");
    await wrapper.find(".focus-node").trigger("click");
    await wrapper.find(".open-node-root").trigger("click");
    await wrapper.find(".open-node-detail").trigger("click");

    expect(wrapper.emitted("copy-csv")).toHaveLength(1);
    expect(wrapper.emitted("view-detail")).toHaveLength(1);
    expect(wrapper.emitted("open-detail-new-window")).toHaveLength(1);
    expect(wrapper.emitted("open-as-root")).toHaveLength(1);
    expect(wrapper.emitted("update:attack-path-filters")?.at(-1)).toEqual([
      { risk: "R0001" },
    ]);
    expect(wrapper.emitted("reset-attack-path-filters")).toHaveLength(1);
    expect(wrapper.emitted("focus-node")?.[0]).toEqual(["R0001"]);
    expect(wrapper.emitted("open-node-as-root")?.[0]).toEqual(["R0001"]);
    expect(wrapper.emitted("open-node-detail")?.[0]).toEqual(["R0001"]);
  });
});
