import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick, type VNode } from "vue";
import RelationNodeDrawerRelations from "@/components/relation/RelationNodeDrawerRelations.vue";
import { RelationType } from "@/views/relation/relationTypes";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

type RelationSummary = InstanceType<
  typeof RelationNodeDrawerRelations
>["$props"]["selectedNetworkRelations"][number];

const relation = (
  overrides: Partial<RelationSummary> = {},
): RelationSummary => ({
  relationKey: "R0001->A0001",
  relationLineKey: "relationView.riskAvoidanceRelation",
  direction: "流出",
  directionKey: "outgoing",
  text: "规避",
  directness: "直接",
  directnessKey: "direct",
  otherNodeId: "A0001",
  otherNodeType: RelationType.avoidance,
  otherNodeTitle: "验证码",
  sourceFields: ["Risk.avoidances"],
  evidenceLabel: "Risk.avoidances",
  explanation: "风险通过规避手段缓解。",
  impactHint: "影响提示",
  qualityFlags: ["verified"],
  ...overrides,
});

const baseRelations = [
  relation(),
  relation({
    relationKey: "AT0001->R0001",
    relationLineKey: "relationView.attackToolDirectRiskRelation",
    direction: "流入",
    directionKey: "incoming",
    text: "直接造成",
    directness: "间接",
    directnessKey: "indirect",
    otherNodeId: "AT0001",
    otherNodeType: RelationType.attackTool,
    otherNodeTitle: "撞库工具",
    sourceFields: ["AttackTool.directCauseRisks"],
    evidenceLabel: "AttackTool.directCauseRisks",
    explanation: "攻击工具直接造成风险。",
    impactHint: "攻击链路提示",
    qualityFlags: [],
  }),
  relation({
    relationKey: "TA0001->AT0001",
    relationLineKey: "relationView.threatActorUseToolRelation",
    direction: "流入",
    directionKey: "incoming",
    text: "使用工具",
    directness: "直接",
    directnessKey: "direct",
    otherNodeId: "TA0001",
    otherNodeType: RelationType.threatActor,
    otherNodeTitle: "黑产团伙",
    sourceFields: ["ThreatActor.useAttackTools"],
    evidenceLabel: "ThreatActor.useAttackTools",
    explanation: "威胁行为者使用攻击工具。",
    impactHint: "组织链路提示",
    qualityFlags: ["needs-review"],
  }),
];

const buttonStub = {
  template: '<button class="el-button"><slot /></button>',
};

const tableColumnStub = {
  template: "<slot />",
};

const tableStub = {
  props: ["data", "rowClassName"],
  setup(
    props: {
      data: RelationSummary[];
      rowClassName?: (params: { row: RelationSummary }) => string;
    },
    { slots }: { slots: { default?: () => VNode[] } },
  ) {
    const renderCell = (column: VNode, row: RelationSummary) => {
      const columnSlots = column.children as
        | { default?: (params: { row: RelationSummary }) => unknown }
        | undefined;

      if (typeof columnSlots?.default === "function") {
        return columnSlots.default({ row });
      }

      const columnProps = column.props as { prop?: keyof RelationSummary } | null;
      return columnProps?.prop ? row[columnProps.prop] : null;
    };

    return () =>
      h(
        "div",
        { class: "el-table node-relation-table" },
        props.data.map((row) =>
          h(
            "div",
            {
              class: [
                "node-relation-table-row",
                props.rowClassName?.({ row }),
              ],
            },
            slots.default?.().map((column) => renderCell(column, row)),
          ),
        ),
      );
  },
};

const mountRelations = (
  props: Partial<InstanceType<typeof RelationNodeDrawerRelations>["$props"]> = {},
) =>
  mount(RelationNodeDrawerRelations, {
    props: {
      selectedNetworkRelations: baseRelations,
      isRelationOnSelectedPath: (relationKey: string) =>
        relationKey === "AT0001->R0001",
      copyFeedbackMessage: "",
      copyFeedbackType: "success",
      ...props,
    },
    global: {
      stubs: {
        ElButton: buttonStub,
        ElTable: tableStub,
        ElTableColumn: tableColumnStub,
      },
    },
  });

describe("RelationNodeDrawerRelations", () => {
  it("渲染多实体关系、筛选控件、复制反馈和高亮行", () => {
    const wrapper = mountRelations({
      copyFeedbackMessage: "已复制",
      copyFeedbackType: "success",
    });

    expect(wrapper.text()).toContain("relationView.allRelations");
    expect(wrapper.text()).toContain("已复制");
    expect(wrapper.text()).toContain("A0001");
    expect(wrapper.text()).toContain("AT0001");
    expect(wrapper.text()).toContain("TA0001");
    expect(wrapper.find(".node-relation-row-active").exists()).toBe(true);
    expect(wrapper.findAll(".node-relation-filter-select")).toHaveLength(3);
  });

  it("空关系列表时保留过滤区和空表状态", () => {
    const wrapper = mountRelations({
      selectedNetworkRelations: [],
    });

    expect(wrapper.text()).toContain(
      'relationView.filteredRelationCount:{"count":0,"total":0}',
    );
    expect(wrapper.find(".node-relation-link").exists()).toBe(false);
    expect(wrapper.find(".node-filter-clear-button").attributes("disabled")).toBe(
      "",
    );
  });

  it("按方向、关系类型和直接性过滤，并支持清空", async () => {
    const wrapper = mountRelations();
    const selects = wrapper.findAll("select");

    await selects[0].setValue("incoming");
    await nextTick();
    expect(wrapper.text()).not.toContain("验证码");
    expect(wrapper.text()).toContain("撞库工具");
    expect(wrapper.text()).toContain("黑产团伙");

    await selects[1].setValue("relationView.threatActorUseToolRelation");
    await nextTick();
    expect(wrapper.text()).not.toContain("撞库工具");
    expect(wrapper.text()).toContain("黑产团伙");

    await selects[2].setValue("direct");
    await nextTick();
    expect(wrapper.text()).toContain("黑产团伙");

    await wrapper.find(".node-filter-clear-button").trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("验证码");
    expect(wrapper.text()).toContain("撞库工具");
    expect(wrapper.text()).toContain("黑产团伙");
  });

  it("暴露方向筛选方法并在关系数据变化时重置筛选", async () => {
    const wrapper = mountRelations();

    wrapper.vm.setDirectionFilter("incoming");
    await nextTick();
    expect(wrapper.text()).not.toContain("验证码");
    expect(wrapper.text()).toContain("撞库工具");

    await wrapper.setProps({
      selectedNetworkRelations: [baseRelations[0]],
    });
    await nextTick();
    expect(wrapper.text()).toContain("验证码");
    expect(wrapper.text()).not.toContain("撞库工具");
  });

  it("转发复制和节点详情事件", async () => {
    const wrapper = mountRelations();

    await wrapper.find(".node-explain-actions .el-button").trigger("click");
    await wrapper.find(".node-relation-link").trigger("click");

    expect(wrapper.emitted("copy-csv")).toHaveLength(1);
    expect(wrapper.emitted("open-node-detail")?.[0]).toEqual(["A0001"]);
  });

  it("关系数量超过预览上限时支持展开和折叠", async () => {
    const manyRelations = Array.from({ length: 18 }, (_, index) =>
      relation({
        relationKey: `R0001->A${index.toString().padStart(4, "0")}`,
        otherNodeId: `A${index.toString().padStart(4, "0")}`,
        otherNodeTitle: `规避 ${index}`,
      }),
    );
    const wrapper = mountRelations({
      selectedNetworkRelations: manyRelations,
    });

    expect(wrapper.findAll(".node-relation-link")).toHaveLength(15);
    expect(wrapper.text()).toContain("relationView.hiddenRelationCount");

    await wrapper.find(".node-relation-more").trigger("click");
    expect(wrapper.findAll(".node-relation-link")).toHaveLength(18);

    await wrapper.find(".node-relation-more").trigger("click");
    expect(wrapper.findAll(".node-relation-link")).toHaveLength(15);
  });
});
