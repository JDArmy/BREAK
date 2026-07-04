import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { inject, ref } from "vue";
import RelationAnalysisCoverageColumn from "@/components/relation/RelationAnalysisCoverageColumn.vue";
import RelationAnalysisDetailColumn from "@/components/relation/RelationAnalysisDetailColumn.vue";
import RelationAnalysisPathColumn from "@/components/relation/RelationAnalysisPathColumn.vue";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";
import {
  RelationType,
  type AttackPathDetail,
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


const detailContentStub = {
  props: [
    "showRootRelationBlock",
    "showCoverageBlock",
    "showAttackPathBlock",
    "showOpenAsRootAction",
    "hideRelatedEntityActions",
  ],
  emits: [
    "update:attack-path-filters",
  ],
  setup() {
    // DetailColumn 现通过 inject 取 vm，stub 同步用 inject 显示 selectedNetworkNode
    const vm = inject(RELATION_VIEW_MODEL_KEY)!;
    return { vm };
  },
  template: `
    <div class="detail-content-stub">
      <span>{{ vm.selectedNetworkNode.value?.id }} {{ vm.selectedNetworkNodeTitle.value }}</span>
      <span class="detail-flags">{{ showRootRelationBlock }} {{ showCoverageBlock }} {{ showAttackPathBlock }} {{ showOpenAsRootAction }}</span>
      <button class="update-filter" @click="$emit('update:attack-path-filters', { risk: 'R0001' })">filter</button>
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
  // DetailColumn 现通过 inject 取 vm，mount 时 provide mock vm
  const createMockVm = (selectedNetworkNode: { id: string; type: string } | null) => ({
    selectedNetworkNode: ref(selectedNetworkNode),
    selectedNetworkNodeTitle: ref("流程自动化"),
  });

  const mountDetailColumn = (selectedNetworkNode: { id: string; type: string } | null = {
    id: "R0001",
    type: RelationType.risk as unknown as string,
  }) =>
    mount(RelationAnalysisDetailColumn, {
      global: {
        provide: {
          [RELATION_VIEW_MODEL_KEY as symbol]: createMockVm(selectedNetworkNode),
        },
        stubs: {
          RelationNodeDetailContent: detailContentStub,
        },
      },
    });

  it("没有选中节点时不渲染右侧详情", () => {
    const wrapper = mountDetailColumn(null);

    expect(wrapper.find(".detail-content-stub").exists()).toBe(false);
  });

  it("渲染右侧详情并关闭抽屉专属块", async () => {
    const wrapper = mountDetailColumn();

    expect(wrapper.text()).toContain("relationView.nodeDetail");
    expect(wrapper.text()).toContain("R0001 流程自动化");
    // 4 个 showXxx 配置均为 false（DetailColumn 对 Content 的差异化配置）
    expect(wrapper.find(".detail-flags").text()).toBe("false false false false");
  });

  it("继续透传右侧详情 attack-path 筛选事件", async () => {
    const wrapper = mountDetailColumn();

    await wrapper.find(".update-filter").trigger("click");

    // DetailColumn 现仅透传 update:attack-path-filters（其余事件 Content 直接调 vm）
    expect(wrapper.emitted("update:attack-path-filters")?.[0]).toEqual([
      { risk: "R0001" },
    ]);
  });
});
