import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import RelationAnalysisCoverageColumn from "@/components/relation/RelationAnalysisCoverageColumn.vue";
import RelationAnalysisDetailColumn from "@/components/relation/RelationAnalysisDetailColumn.vue";
import RelationAnalysisPathColumn from "@/components/relation/RelationAnalysisPathColumn.vue";
import {
  RelationType,
  type AttackPathDetail,
  type AttackPathFilterOption,
  type AttackPathFilterType,
  type RiskAvoidanceCoverageItem,
} from "@/views/relation/relationTypes";
import type { NodeSpecialInsightSummary } from "@/components/relation/relationNodeDrawerInsightTypes";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const coverageItems: RiskAvoidanceCoverageItem[] = [
  {
    avoidanceKey: "A0001",
    avoidanceTitle: "验证码",
    source: "risk",
    sourceLabel: "风险侧",
    pathCount: 2,
    attackToolLabels: ["工具一"],
    sourceFields: ["Risk.avoidances"],
  },
  {
    avoidanceKey: "A0002",
    avoidanceTitle: "限流",
    source: "both",
    sourceLabel: "双侧",
    pathCount: 1,
    attackToolLabels: [],
    sourceFields: ["AttackTool.avoidances"],
  },
];

const specialInsight: NodeSpecialInsightSummary = {
  title: "专项洞察",
  summary: "需要补覆盖",
  severity: "warning",
  sections: [
    {
      title: "缺口",
      summary: "攻击工具缺口",
      metrics: [],
      items: [
        {
          id: "AT0001",
          title: "攻击工具",
          type: RelationType.attackTool,
          meta: "未覆盖",
          sourceFields: ["AttackTool.avoidances"],
        },
      ],
    },
  ],
  recommendation: "补齐规避手段",
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

const filterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]> = {
  [RelationType.threatActor]: [],
  [RelationType.attackTool]: [],
  [RelationType.risk]: [],
  [RelationType.avoidance]: [],
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

describe("RelationAnalysisCoverageColumn", () => {
  it("渲染覆盖列表并转发规避筛选和移动端展开事件", async () => {
    const wrapper = mount(RelationAnalysisCoverageColumn, {
      props: {
        attackPathFilters: { [RelationType.avoidance]: "A0001" },
        displayedCoverageItems: coverageItems,
        hasExpandedCoverageItems: false,
        hiddenCoverageItemCount: 3,
        isMobile: true,
        riskAvoidanceCoverage: {
          totalCount: 2,
          directCount: 1,
          attackToolCount: 1,
          overlapCount: 0,
        },
        selectedNodeSpecialInsightSummary: null,
      },
    });

    expect(wrapper.text()).toContain("relationView.coverageMode");
    expect(wrapper.text()).toContain("验证码");
    expect(wrapper.find(".relation-analysis-coverage-item-active").text()).toContain("A0001");

    await wrapper.findAll(".relation-analysis-coverage-item")[1].trigger("click");
    await wrapper.find(".node-attack-path-more-button").trigger("click");

    expect(wrapper.emitted("apply-avoidance-filter")?.[0]).toEqual(["A0002"]);
    expect(wrapper.emitted("toggle-coverage-items")).toHaveLength(1);
  });

  it("无覆盖数据时渲染专项洞察并转发洞察筛选", async () => {
    const wrapper = mount(RelationAnalysisCoverageColumn, {
      props: {
        attackPathFilters: {},
        displayedCoverageItems: [],
        hasExpandedCoverageItems: false,
        hiddenCoverageItemCount: 0,
        isMobile: false,
        riskAvoidanceCoverage: null,
        selectedNodeSpecialInsightSummary: specialInsight,
      },
    });

    expect(wrapper.text()).toContain("专项洞察");
    await wrapper.find(".node-special-insight-item").trigger("click");

    expect(wrapper.emitted("apply-special-insight-filter")?.[0]).toEqual([
      { type: RelationType.attackTool, id: "AT0001" },
    ]);
  });
});

describe("RelationAnalysisPathColumn", () => {
  it("渲染选中路径详情和路径列表并转发选择事件", async () => {
    const paths = [pathDetail("p1"), pathDetail("p2")];
    const wrapper = mount(RelationAnalysisPathColumn, {
      props: {
        attackPathDetails: paths,
        displayedAttackPathDetails: paths,
        filteredAttackPathCount: 2,
        hasExpandedAttackPaths: false,
        hiddenAttackPathCount: 0,
        isMobile: false,
        selectedAttackPathDetail: paths[0],
      },
    });

    expect(wrapper.text()).toContain("relationView.pathDetail");
    expect(wrapper.text()).toContain("组织");
    expect(wrapper.text()).toContain("路径 p2");

    await wrapper.findAll(".relation-analysis-path-list-item")[1].trigger("click");

    expect(wrapper.emitted("select-attack-path")?.[0]).toEqual(["p2"]);
  });

  it("移动端有隐藏路径时转发展开事件", async () => {
    const paths = [pathDetail("p1")];
    const wrapper = mount(RelationAnalysisPathColumn, {
      props: {
        attackPathDetails: paths,
        displayedAttackPathDetails: paths,
        filteredAttackPathCount: 1,
        hasExpandedAttackPaths: false,
        hiddenAttackPathCount: 4,
        isMobile: true,
        selectedAttackPathDetail: null,
      },
    });

    await wrapper.find(".node-attack-path-more-button").trigger("click");

    expect(wrapper.emitted("toggle-attack-paths")).toHaveLength(1);
  });
});

describe("RelationAnalysisDetailColumn", () => {
  const mountDetailColumn = (
    props: Partial<InstanceType<typeof RelationAnalysisDetailColumn>["$props"]> = {},
  ) =>
    mount(RelationAnalysisDetailColumn, {
      props: {
        attackPathFilterOptions: filterOptions,
        attackPathFilters: {},
        drawerCopyFeedbackMessage: "",
        drawerCopyFeedbackType: "success",
        getNodeTypeTitle: (type: string) => type,
        hasActiveAttackPathFilters: false,
        isCurrentNodeRoot: true,
        isPathNodeCurrentSelection: () => false,
        isRelationOnSelectedPath: () => false,
        relKey: "R0001",
        rootNodeRelations: [],
        selectedNetworkNode: { id: "R0001", type: RelationType.risk },
        selectedNetworkNodeTitle: "流程自动化",
        selectedNetworkRelationCounts: { incoming: 1, outgoing: 2 },
        selectedNetworkRelations: [],
        selectedNodeAnalysisSummary: null,
        selectedNodeAttackPathDescription: "",
        selectedNodeAttackPathExplanations: [],
        selectedNodeAttackPathSummary: [],
        selectedNodeBusinessSceneImpactSummary: null,
        selectedNodeCoverageSummary: null,
        selectedNodeRelatedEntitySummary: null,
        selectedNodeRootPath: null,
        ...props,
      },
      global: {
        stubs: {
          RelationNodeDetailContent: detailContentStub,
        },
      },
    });

  it("没有选中节点时不渲染右侧详情", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapper = mountDetailColumn({ selectedNetworkNode: null } as any);

    expect(wrapper.find(".detail-content-stub").exists()).toBe(false);
  });

  it("渲染右侧详情并关闭抽屉专属块", async () => {
    const wrapper = mountDetailColumn();

    expect(wrapper.text()).toContain("relationView.nodeDetail");
    expect(wrapper.text()).toContain("R0001 流程自动化");
    expect(wrapper.find(".detail-flags").text()).toBe("false false false false");
  });

  it("继续透传右侧详情交互事件", async () => {
    const wrapper = mountDetailColumn();

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
    expect(wrapper.emitted("update:attack-path-filters")?.[0]).toEqual([
      { risk: "R0001" },
    ]);
    expect(wrapper.emitted("reset-attack-path-filters")).toHaveLength(1);
    expect(wrapper.emitted("focus-node")?.[0]).toEqual(["R0001"]);
    expect(wrapper.emitted("open-node-as-root")?.[0]).toEqual(["R0001"]);
    expect(wrapper.emitted("open-node-detail")?.[0]).toEqual(["R0001"]);
  });
});
