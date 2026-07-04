import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, ref } from "vue";
import RelationPathExplorerPane from "@/components/relation/RelationPathExplorerPane.vue";
import { RelationType } from "@/views/relation/relationTypes";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

// mock vue-i18n：useI18n 返回 t: key => key
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref("zh-CN"),
  }),
}));

// mock @/BREAK：导出 default 含 risks/avoidances/attackTools/threatActors 的简单对象
// buildOptions 会读 BREAK[breakKey] 并取 Object.keys，故每类放至少 1 个实体
vi.mock("@/BREAK", () => ({
  default: {
    risks: { R0001: { title: "风险" }, R0002: { title: "风险2" } },
    avoidances: { A0001: { title: "规避手段" }, A0002: { title: "规避手段2" } },
    attackTools: { AT0001: { title: "攻击工具" }, AT0002: { title: "攻击工具2" } },
    threatActors: { TA0001: { title: "威胁行为者" }, TA0002: { title: "威胁行为者2" } },
  },
}));

// RelationTypeMapping：与 createRelationTypeMapping 返回结构对齐
// （title/BreakKey/relType/color/disableContextMenu）
const relationTypeMapping = {
  [RelationType.risk]: {
    title: "风险",
    BreakKey: "risks",
    relType: RelationType.risk,
    color: "#000",
    disableContextMenu: ref(false),
  },
  [RelationType.avoidance]: {
    title: "规避手段",
    BreakKey: "avoidances",
    relType: RelationType.avoidance,
    color: "#111",
    disableContextMenu: ref(false),
  },
  [RelationType.attackTool]: {
    title: "攻击工具",
    BreakKey: "attackTools",
    relType: RelationType.attackTool,
    color: "#222",
    disableContextMenu: ref(false),
  },
  [RelationType.threatActor]: {
    title: "威胁行为者",
    BreakKey: "threatActors",
    relType: RelationType.threatActor,
    color: "#333",
    disableContextMenu: ref(false),
  },
  [RelationType.term]: {
    title: "术语",
    BreakKey: "terms",
    relType: RelationType.term,
    color: "#444",
    disableContextMenu: ref(false),
  },
};

interface MockViewModelOptions {
  relType?: RelationType;
  relKey?: string;
  pathExplorerStartType?: RelationType;
  pathExplorerStartKey?: string;
  pathExplorerEndType?: RelationType;
  pathExplorerEndKey?: string;
  activeView?: string;
}

/** 构造 mock viewModel：含 RelationPathExplorerPane inject 后解构所需的全部字段 */
const createMockViewModel = (options: MockViewModelOptions = {}) => {
  const relType = ref<RelationType>(options.relType ?? RelationType.risk);
  const relKey = ref<string>(options.relKey ?? "R0001");
  const pathExplorerStartType = ref<RelationType>(
    options.pathExplorerStartType ?? RelationType.risk,
  );
  const pathExplorerStartKey = ref<string>(options.pathExplorerStartKey ?? "R0001");
  const pathExplorerEndType = ref<RelationType>(
    options.pathExplorerEndType ?? RelationType.avoidance,
  );
  const pathExplorerEndKey = ref<string>(options.pathExplorerEndKey ?? "A0001");
  const pathExplorerMaxDepth = ref<number>(4);
  const pathExplorerMaxPaths = ref<number>(10);
  const pathExplorerHasData = ref<boolean>(false);
  const pathExplorerChartHeight = ref<number>(520);
  const pathExplorerStats = ref<{ pathCount: number; minHops: number; maxHops: number } | null>(
    null,
  );
  const hasTarget = computed(() => Boolean(pathExplorerEndKey.value));
  const searching = ref<boolean>(false);
  const sankeyChartMinWidth = computed(() => 0);
  const pathExplorerSankeyController = {
    setSankeyChartElement: vi.fn(),
    renderSankeyChart: vi.fn(),
    resizeSankeyChart: vi.fn(),
    updateSankeyTheme: vi.fn(),
    disposeSankeyChart: vi.fn(),
    hideSankeyTooltip: vi.fn(),
  };
  const activeView = ref<string>(options.activeView ?? "pathExplorer");

  return {
    relType,
    relKey,
    pathExplorerStartType,
    pathExplorerStartKey,
    pathExplorerEndType,
    pathExplorerEndKey,
    pathExplorerMaxDepth,
    pathExplorerMaxPaths,
    pathExplorerHasData,
    pathExplorerChartHeight,
    pathExplorerStats,
    hasTarget,
    searching,
    sankeyChartMinWidth,
    pathExplorerSankeyController,
    activeView,
    RelationTypeMapping: relationTypeMapping,
  };
};

// element-plus 组件用简单 stub（ElSelect/ElOption/ElSelectV2/ElSlider）
const stubs = {
  ElSelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<select class="el-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  ElOption: {
    props: ["label", "value"],
    template: '<option :value="value">{{ label }}</option>',
  },
  ElSelectV2: {
    props: ["modelValue", "options"],
    emits: ["update:modelValue"],
    template:
      '<select class="el-select-v2-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
  },
  ElSlider: {
    props: ["modelValue", "min", "max", "step", "size"],
    emits: ["update:modelValue", "change"],
    template: '<div class="el-slider-stub" />',
  },
};

const mountPane = (options: MockViewModelOptions = {}) => {
  const viewModel = createMockViewModel(options);
  const wrapper = mount(RelationPathExplorerPane, {
    global: {
      stubs,
      provide: {
        [RELATION_VIEW_MODEL_KEY as symbol]: viewModel,
      },
    },
  });
  return { wrapper, viewModel };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RelationPathExplorerPane", () => {
  it("非激活状态隐藏路径探索面板（v-show）", () => {
    // activeView !== 'pathExplorer' 时 active computed 为 false，v-show 隐藏但 DOM 仍在
    const { wrapper } = mountPane({ activeView: "network" });
    const pane = wrapper.find(".path-explorer-pane");
    expect(pane.exists()).toBe(true);
    expect(pane.attributes("style") ?? "").toContain("display: none");
  });

  it("用户手动切起点类型时清空起点实体（startTypeModel setter）", async () => {
    // 组件职责：用户经 el-select 切 startType → startTypeModel setter 设 startType + 清空 startKey。
    // relType→startType 同步由 relationViewAssembly 负责（不在组件职责内，见 assembly 测试）。
    const { wrapper, viewModel } = mountPane();

    expect(viewModel.pathExplorerStartType.value).toBe(RelationType.risk);
    expect(viewModel.pathExplorerStartKey.value).toBe("R0001");

    // 模拟用户经 el-select 切换起点类型（触发 startTypeModel setter）
    await wrapper.find(".el-select-stub").setValue(RelationType.avoidance);
    await nextTick();

    expect(viewModel.pathExplorerStartType.value).toBe(RelationType.avoidance);
    // setter 清空了 startKey
    expect(viewModel.pathExplorerStartKey.value).toBe("");
  });

  it("assembly 直设 pathExplorerStartType 不清空 startKey（computed setter 不触发）", async () => {
    // assembly 根节点同步直设 ref.value（绕过 computed setter），不应清空 startKey。
    // 此用例验证 startTypeModel get 返回 ref 值，且直设 ref 不触发 setter 清空。
    const { viewModel } = mountPane();

    expect(viewModel.pathExplorerStartKey.value).toBe("R0001");

    // 模拟 assembly 直设 startType（根节点同步路径）
    viewModel.pathExplorerStartType.value = RelationType.attackTool;
    await nextTick();

    // startType 变化但 startKey 未被清空（无 setter 触发）
    expect(viewModel.pathExplorerStartType.value).toBe(RelationType.attackTool);
    expect(viewModel.pathExplorerStartKey.value).toBe("R0001");
  });
});
