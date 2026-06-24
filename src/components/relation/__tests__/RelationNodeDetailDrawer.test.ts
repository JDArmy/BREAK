import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import RelationNodeDetailDrawer from "@/components/relation/RelationNodeDetailDrawer.vue";
import { RelationType } from "@/views/relation/relationTypes";

const mocks = vi.hoisted(() => ({
  isMobile: false,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/composables/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: mocks.isMobile }),
}));

const baseProps = {
  modelValue: true,
  selectedNetworkNode: { id: "R0001", type: RelationType.risk },
  selectedNetworkNodeTitle: "流程自动化",
  selectedNetworkRelationCounts: { incoming: 1, outgoing: 2 },
  rootNodeRelations: [],
  selectedNodeRootPath: null,
  selectedNodeAnalysisSummary: null,
  selectedNodeAttackPathSummary: [],
  selectedNodeAttackPathDescription: "",
  selectedNodeAttackPathExplanations: [],
  attackPathFilterOptions: {
    [RelationType.threatActor]: [],
    [RelationType.attackTool]: [],
    [RelationType.risk]: [],
    [RelationType.avoidance]: [],
  },
  attackPathFilters: {},
  hasActiveAttackPathFilters: false,
  selectedNodeBusinessSceneImpactSummary: null,
  selectedNodeCoverageSummary: null,
  selectedNodeRelatedEntitySummary: null,
  isCurrentNodeRoot: true,
  selectedNetworkRelations: [],
  relKey: "R0001",
  getNodeTypeTitle: (type: string) => type,
  isPathNodeCurrentSelection: () => false,
  isRelationOnSelectedPath: () => false,
  drawerCopyFeedbackMessage: "",
  drawerCopyFeedbackType: "success" as const,
};

const drawerStub = {
  props: ["modelValue", "title", "direction", "size"],
  emits: ["update:modelValue"],
  template:
    '<section class="drawer-stub" :data-title="title" :data-direction="direction" :data-size="size"><button class="close-drawer" @click="$emit(\'update:modelValue\', false)">close</button><slot /></section>',
};

const contentStub = {
  props: [
    "selectedNetworkNode",
    "selectedNetworkNodeTitle",
    "attackPathFilters",
    "showOpenAsRootAction",
    "showRootRelationBlock",
    "showCoverageBlock",
    "showAttackPathBlock",
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
    <div class="content-stub">
      <span>{{ selectedNetworkNode.id }} {{ selectedNetworkNodeTitle }}</span>
      <span class="flags">{{ showOpenAsRootAction }} {{ showRootRelationBlock }} {{ showCoverageBlock }} {{ showAttackPathBlock }}</span>
      <button class="copy-csv" @click="$emit('copy-csv')">copy</button>
      <button class="view-detail" @click="$emit('view-detail')">view</button>
      <button class="open-new" @click="$emit('open-detail-new-window')">new</button>
      <button class="open-as-root" @click="$emit('open-as-root')">root</button>
      <button class="update-filters" @click="$emit('update:attack-path-filters', { risk: ['R0001'] })">filter</button>
      <button class="reset-filters" @click="$emit('reset-attack-path-filters')">reset</button>
      <button class="focus-node" @click="$emit('focus-node', selectedNetworkNode.id)">focus</button>
      <button class="open-node-root" @click="$emit('open-node-as-root', selectedNetworkNode.id)">node-root</button>
      <button class="open-node-detail" @click="$emit('open-node-detail', selectedNetworkNode.id)">node-detail</button>
    </div>
  `,
};

const mountDrawer = (props = {}) =>
  mount(RelationNodeDetailDrawer, {
    props: {
      ...baseProps,
      ...props,
    },
    global: {
      stubs: {
        ElDrawer: drawerStub,
        RelationNodeDetailContent: contentStub,
      },
    },
  });

afterEach(() => {
  mocks.isMobile = false;
});

describe("RelationNodeDetailDrawer", () => {
  it("按桌面尺寸渲染抽屉并转发子组件事件", async () => {
    const wrapper = mountDrawer();

    expect(wrapper.find(".drawer-stub").attributes("data-direction")).toBe("rtl");
    expect(wrapper.find(".drawer-stub").attributes("data-size")).toBe("520px");
    expect(wrapper.text()).toContain("R0001 流程自动化");
    expect(wrapper.find(".flags").text()).toBe("true true true true");

    await wrapper.find(".copy-csv").trigger("click");
    await wrapper.find(".view-detail").trigger("click");
    await wrapper.find(".open-new").trigger("click");
    await wrapper.find(".open-as-root").trigger("click");
    await wrapper.find(".update-filters").trigger("click");
    await wrapper.find(".reset-filters").trigger("click");
    await wrapper.find(".focus-node").trigger("click");
    await wrapper.find(".open-node-root").trigger("click");
    await wrapper.find(".open-node-detail").trigger("click");

    expect(wrapper.emitted("copy-csv")).toHaveLength(1);
    expect(wrapper.emitted("view-detail")).toHaveLength(1);
    expect(wrapper.emitted("open-detail-new-window")).toHaveLength(1);
    expect(wrapper.emitted("open-as-root")).toHaveLength(1);
    expect(wrapper.emitted("update:attack-path-filters")?.[0]).toEqual([{ risk: ["R0001"] }]);
    expect(wrapper.emitted("reset-attack-path-filters")).toHaveLength(1);
    expect(wrapper.emitted("focus-node")?.[0]).toEqual(["R0001"]);
    expect(wrapper.emitted("open-node-as-root")?.[0]).toEqual(["R0001"]);
    expect(wrapper.emitted("open-node-detail")?.[0]).toEqual(["R0001"]);
  });

  it("关闭抽屉时同步 modelValue", async () => {
    const wrapper = mountDrawer();

    await wrapper.find(".close-drawer").trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
  });

  it("移动端应该使用底部抽屉尺寸", () => {
    mocks.isMobile = true;

    const wrapper = mountDrawer();

    expect(wrapper.find(".drawer-stub").attributes("data-direction")).toBe("btt");
    expect(wrapper.find(".drawer-stub").attributes("data-size")).toBe("82dvh");
  });

  it("没有选中节点时不渲染详情内容", () => {
    const wrapper = mountDrawer({
      selectedNetworkNode: null,
    });

    expect(wrapper.find(".content-stub").exists()).toBe(false);
  });
});
