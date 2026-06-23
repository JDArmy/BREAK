import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
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

describe("RelationNodeDetailDrawer", () => {
  it("按桌面尺寸渲染抽屉并转发子组件事件", async () => {
    const wrapper = mount(RelationNodeDetailDrawer, {
      props: baseProps,
      global: {
        stubs: {
          ElDrawer: {
            props: ["modelValue", "title", "direction", "size"],
            emits: ["update:modelValue"],
            template:
              '<section class="drawer-stub" :data-title="title" :data-direction="direction" :data-size="size"><slot /></section>',
          },
          RelationNodeDetailContent: {
            props: ["selectedNetworkNode", "selectedNetworkNodeTitle"],
            emits: ["view-detail", "focus-node", "open-node-as-root"],
            template:
              '<div class="content-stub"><span>{{ selectedNetworkNode.id }} {{ selectedNetworkNodeTitle }}</span><button class="view-detail" @click="$emit(\'view-detail\')">view</button><button class="focus-node" @click="$emit(\'focus-node\', selectedNetworkNode.id)">focus</button><button class="open-root" @click="$emit(\'open-node-as-root\', selectedNetworkNode.id)">root</button></div>',
          },
        },
      },
    });

    expect(wrapper.find(".drawer-stub").attributes("data-direction")).toBe("rtl");
    expect(wrapper.find(".drawer-stub").attributes("data-size")).toBe("520px");
    expect(wrapper.text()).toContain("R0001 流程自动化");

    await wrapper.find(".view-detail").trigger("click");
    await wrapper.find(".focus-node").trigger("click");
    await wrapper.find(".open-root").trigger("click");

    expect(wrapper.emitted("view-detail")).toHaveLength(1);
    expect(wrapper.emitted("focus-node")?.[0]).toEqual(["R0001"]);
    expect(wrapper.emitted("open-node-as-root")?.[0]).toEqual(["R0001"]);
  });

  it("关闭抽屉时同步 modelValue", async () => {
    const wrapper = mount(RelationNodeDetailDrawer, {
      props: baseProps,
      global: {
        stubs: {
          ElDrawer: {
            props: ["modelValue"],
            emits: ["update:modelValue"],
            template:
              '<section><button class="close-drawer" @click="$emit(\'update:modelValue\', false)">close</button><slot /></section>',
          },
          RelationNodeDetailContent: true,
        },
      },
    });

    await wrapper.find(".close-drawer").trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
  });
});
