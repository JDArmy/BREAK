import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, inject, ref } from "vue";
import RelationNodeDetailDrawer from "@/components/relation/RelationNodeDetailDrawer.vue";
import { RelationType } from "@/views/relation/relationTypes";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

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

const relationTypeMapping = {
  [RelationType.risk]: { title: "风险", BreakKey: "risks" },
  [RelationType.avoidance]: { title: "规避手段", BreakKey: "avoidances" },
  [RelationType.attackTool]: { title: "攻击工具", BreakKey: "attackTools" },
  [RelationType.threatActor]: { title: "威胁行为者", BreakKey: "threatActors" },
  [RelationType.term]: { title: "术语", BreakKey: "terms" },
};

interface MockViewModelOptions {
  selectedNetworkNode?: { id: string; type: RelationType } | null;
  selectedNetworkNodeTitle?: string;
  activeView?: string;
}

/** 构造 mock viewModel（含 RelationNodeDetailDrawer 所需的 ref/computed/方法） */
const createMockViewModel = (options: MockViewModelOptions = {}) => {
  // 用 in 判断而非 ??，以支持显式传 null（nullish coalescing 会把 null 视为缺失）
  const selectedNetworkNode = ref<{ id: string; type: RelationType } | null>(
    "selectedNetworkNode" in options
      ? options.selectedNetworkNode!
      : { id: "R0001", type: RelationType.risk },
  );
  return {
    // ref 类
    nodeDetailDrawerVisible: ref(true),
    selectedNetworkNode,
    selectedNetworkNodeTitle: ref(options.selectedNetworkNodeTitle ?? "流程自动化"),
    selectedNetworkRelationCounts: ref({ incoming: 1, outgoing: 2 }),
    rootNodeRelations: ref([]),
    selectedNodeRootPath: ref(null),
    selectedNodeAnalysisSummary: ref(null),
    selectedNodeRelatedEntitySummary: ref(null),
    selectedNodeAttackPathSummary: ref([]),
    selectedNodeAttackPathDescription: ref(""),
    selectedNodeAttackPathExplanations: ref([]),
    attackPathFilterOptions: ref({
      [RelationType.threatActor]: [],
      [RelationType.attackTool]: [],
      [RelationType.risk]: [],
      [RelationType.avoidance]: [],
    }),
    attackPathFilters: ref<Record<string, unknown>>({}),
    selectedNodeBusinessSceneImpactSummary: ref(null),
    selectedNodeCoverageSummary: ref(null),
    selectedNetworkRelations: ref([]),
    relKey: ref("R0001"),
    drawerCopyFeedbackMessage: ref(""),
    drawerCopyFeedbackType: ref<"success" | "error" | "info">("success"),
    activeView: ref(options.activeView ?? "graph"),
    // computed 类
    hasActiveAttackPathFilters: computed(() => false),
    isCurrentNodeRoot: computed(() => true),
    // 普通对象
    RelationTypeMapping: relationTypeMapping,
    // 方法（vi.fn）
    copySelectedNodeCsv: vi.fn(),
    gotoSelectedNodeDetailView: vi.fn(),
    openSelectedNodeDetailInNewWindow: vi.fn(),
    openSelectedNodeAsRoot: vi.fn(),
    resetAttackPathFilters: vi.fn(),
    focusNodeInDrawer: vi.fn(),
    openNodeAsRootById: vi.fn(),
    gotoNodeDetailViewById: vi.fn(),
    getNodeTypeTitle: vi.fn((type: string) => type),
    isPathNodeCurrentSelection: vi.fn(() => false),
    isRelationOnSelectedPath: vi.fn(() => false),
  };
};

const drawerStub = {
  props: ["modelValue", "title", "direction", "size"],
  emits: ["update:modelValue"],
  template:
    '<section class="drawer-stub" :data-title="title" :data-direction="direction" :data-size="size"><button class="close-drawer" @click="$emit(\'update:modelValue\', false)">close</button><slot /></section>',
};

const contentStub = {
  props: [
    "showOpenAsRootAction",
    "showRootRelationBlock",
    "showCoverageBlock",
    "showAttackPathBlock",
  ],
  emits: [
    "update:attack-path-filters",
    "reset-attack-path-filters",
    "focus-node",
    "open-as-root",
    "open-node-as-root",
  ],
  setup() {
    const vm = inject(RELATION_VIEW_MODEL_KEY)!;
    return { vm };
  },
  template: `
    <div class="content-stub">
      <span>{{ vm.selectedNetworkNode.value?.id }} {{ vm.selectedNetworkNodeTitle.value }}</span>
      <span class="flags">{{ showOpenAsRootAction }} {{ showRootRelationBlock }} {{ showCoverageBlock }} {{ showAttackPathBlock }}</span>
      <button class="open-as-root" @click="$emit('open-as-root')">root</button>
      <button class="update-filters" @click="$emit('update:attack-path-filters', { risk: ['R0001'] })">filter</button>
      <button class="reset-filters" @click="$emit('reset-attack-path-filters')">reset</button>
      <button class="focus-node" @click="$emit('focus-node', vm.selectedNetworkNode.value?.id)">focus</button>
      <button class="open-node-root" @click="$emit('open-node-as-root', vm.selectedNetworkNode.value?.id)">node-root</button>
    </div>
  `,
};

const mountDrawer = (options: MockViewModelOptions = {}) => {
  const viewModel = createMockViewModel(options);
  const wrapper = mount(RelationNodeDetailDrawer, {
    global: {
      stubs: {
        ElDrawer: drawerStub,
        RelationNodeDetailContent: contentStub,
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

describe("RelationNodeDetailDrawer", () => {
  it("按桌面尺寸渲染抽屉并转发子组件事件", async () => {
    const { wrapper, viewModel } = mountDrawer();

    expect(wrapper.find(".drawer-stub").attributes("data-direction")).toBe("rtl");
    expect(wrapper.find(".drawer-stub").attributes("data-size")).toBe("520px");
    expect(wrapper.text()).toContain("R0001 流程自动化");
    expect(wrapper.find(".flags").text()).toBe("true true true true");

    // Drawer 接收改 vm 状态的 emit（update-filters/reset/focus/open-as-root/open-node-root）后调 vm 方法。
    // copy-csv/view-detail/open-new/open-node-detail 由 Content 内部直接调 vm（不经 Drawer），在此不测。
    await wrapper.find(".open-as-root").trigger("click");
    await wrapper.find(".update-filters").trigger("click");
    await wrapper.find(".reset-filters").trigger("click");
    await wrapper.find(".focus-node").trigger("click");
    await wrapper.find(".open-node-root").trigger("click");

    expect(viewModel.openSelectedNodeAsRoot).toHaveBeenCalledTimes(1);
    // update:attack-path-filters 写回 vm.attackPathFilters.value
    expect(viewModel.attackPathFilters.value).toEqual({ risk: ["R0001"] });
    expect(viewModel.resetAttackPathFilters).toHaveBeenCalledTimes(1);
    expect(viewModel.focusNodeInDrawer).toHaveBeenCalledWith("R0001");
    expect(viewModel.openNodeAsRootById).toHaveBeenCalledWith("R0001");
  });

  it("关闭抽屉时同步 modelValue", async () => {
    const { wrapper, viewModel } = mountDrawer();

    await wrapper.find(".close-drawer").trigger("click");

    // el-drawer v-model 直接绑定 vm.nodeDetailDrawerVisible，close 后 ref 写为 false
    expect(viewModel.nodeDetailDrawerVisible.value).toBe(false);
  });

  it("移动端应该使用底部抽屉尺寸", () => {
    mocks.isMobile = true;

    const { wrapper } = mountDrawer();

    expect(wrapper.find(".drawer-stub").attributes("data-direction")).toBe("btt");
    expect(wrapper.find(".drawer-stub").attributes("data-size")).toBe("82dvh");
  });

  it("没有选中节点时不渲染详情内容", () => {
    const { wrapper } = mountDrawer({
      selectedNetworkNode: null,
    });

    expect(wrapper.find(".content-stub").exists()).toBe(false);
  });
});
