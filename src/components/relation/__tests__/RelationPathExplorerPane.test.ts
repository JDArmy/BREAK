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

  it("open-as-root 改 relType/relKey 后起点跟随根节点同步", async () => {
    // P0-2 回归核心：迁移 inject 后 watch([relType, relKey]) 须恢复，
    // 否则 open-as-root 改 route.params 后 pathExplorerStartType/StartKey 不更新
    const { viewModel } = mountPane();

    expect(viewModel.pathExplorerStartType.value).toBe(RelationType.risk);
    expect(viewModel.pathExplorerStartKey.value).toBe("R0001");

    // 模拟 open-as-root：relType/relKey 切到攻击工具
    viewModel.relType.value = RelationType.attackTool;
    viewModel.relKey.value = "AT0001";
    await nextTick();

    expect(viewModel.pathExplorerStartType.value).toBe(RelationType.attackTool);
    expect(viewModel.pathExplorerStartKey.value).toBe("AT0001");
  });

  it("用户手动切 pathExplorerStartType 时清空 startKey（syncFromRoot 不阻止）", async () => {
    // syncFromRoot flag 仅在根节点同步驱动 startType 变化时跳过清空；
    // 用户手动改 startType（不经过 relType watch）须清空 startKey
    const { viewModel } = mountPane();

    expect(viewModel.pathExplorerStartKey.value).toBe("R0001");

    // 用户直接切起点类型（不通过 relType watch 路径）
    viewModel.pathExplorerStartType.value = RelationType.avoidance;
    await nextTick();

    expect(viewModel.pathExplorerStartKey.value).toBe("");
  });

  it("relType 与当前 startType 相同时不同步 startType（不触发清空 startKey）", async () => {
    // relType 已等于 startType 时，watch 内 startType 同步分支被 if 守卫跳过
    // （syncFromRoot 不置位，后续 startType watch 不会清空 startKey）；
    // relKey 变化时 startKey 仍按 key 同步分支更新，不被清空
    const { viewModel } = mountPane();

    expect(viewModel.relType.value).toBe(RelationType.risk);
    expect(viewModel.pathExplorerStartType.value).toBe(RelationType.risk);
    expect(viewModel.pathExplorerStartKey.value).toBe("R0001");

    // relType 仍为 risk（与 startType 相同），只改 relKey 触发 watch
    viewModel.relKey.value = "R0002";
    await nextTick();

    // startType 保持不变；startKey 同步为新 relKey，未被清空
    expect(viewModel.pathExplorerStartType.value).toBe(RelationType.risk);
    expect(viewModel.pathExplorerStartKey.value).toBe("R0002");
  });

  it("relType 切到不同 type 时同步 startType 且 startKey 同步不被清空", async () => {
    // 完整跟随：relType 切到 avoidance，startType 同步切换（syncFromRoot 置位），
    // relKey 同步到 A0001，且 startType watch 因 syncFromRoot 跳过清空
    const { viewModel } = mountPane();

    viewModel.relType.value = RelationType.avoidance;
    viewModel.relKey.value = "A0001";
    await nextTick();

    expect(viewModel.pathExplorerStartType.value).toBe(RelationType.avoidance);
    // syncFromRoot 阻止了 startType watch 清空 startKey，且 relKey 同步分支写入 A0001
    expect(viewModel.pathExplorerStartKey.value).toBe("A0001");
  });
});
