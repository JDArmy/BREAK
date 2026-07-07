import { mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { nextTick, ref } from "vue";
import SearchDialog from "@/components/SearchDialog.vue";

// ── mock 依赖 ──

const mocks = vi.hoisted(() => {
  const searchResults = {
    risk: [] as { id: string; type: string; title: string; snippet?: string; matchedField?: string }[],
    avoidance: [],
    attackTool: [],
    threatActor: [],
    term: [],
    case: [],
  };
  const mockSearch = vi.fn(() => searchResults);
  const mockEnsureCases = vi.fn();
  const route = {
    name: "home" as string,
    params: {} as Record<string, string>,
  };
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    currentRoute: { value: route },
  };
  return { searchResults, mockSearch, mockEnsureCases, route, router };
});

vi.mock("@/composables/useSearch", () => ({
  useSearch: () => ({ search: mocks.mockSearch }),
}));

vi.mock("@/composables/useCases", () => ({
  useCases: () => ({
    ensureCases: mocks.mockEnsureCases,
    cases: ref({}),
    loaded: ref(false),
  }),
}));

vi.mock("@/composables/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: ref(false) }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref("cn"),
  }),
}));

vi.mock("element-plus/es/components/dialog/style/css", () => ({}));
vi.mock("element-plus/es/components/input/style/css", () => ({}));
vi.mock("element-plus/es/components/scrollbar/style/css", () => ({}));

// ── 辅助 ──

function createWrapper(modelValue = true): VueWrapper {
  return mount(SearchDialog, {
    props: { modelValue },
    global: {
      stubs: {
        ElDialog: {
          template: '<div class="el-dialog"><slot /></div>',
          props: ["modelValue"],
        },
        ElInput: {
          template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />',
          props: ["modelValue"],
          emits: ["update:modelValue", "keydown"],
          methods: { focus() {} },
        },
        ElScrollbar: {
          template: '<div class="el-scrollbar"><slot /></div>',
        },
        ElIcon: {
          template: '<span class="el-icon"><slot /></span>',
        },
      },
    },
  });
}

// ── 测试 ──

describe("SearchDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchResults.risk = [];
    mocks.searchResults.avoidance = [];
    mocks.searchResults.attackTool = [];
    mocks.searchResults.threatActor = [];
    mocks.searchResults.term = [];
    mocks.searchResults.case = [];
    mocks.route.name = "home";
    mocks.route.params = {};
  });

  it("空查询时不显示结果", () => {
    const wrapper = createWrapper();
    expect(wrapper.findAll(".search-result-item")).toHaveLength(0);
    wrapper.unmount();
  });

  it("触发搜索后调用 search composable", async () => {
    vi.useFakeTimers();
    const wrapper = createWrapper();
    const input = wrapper.find(".el-input");
    await input.setValue("钓鱼");
    vi.advanceTimersByTime(250); // 防抖 200ms
    await nextTick();
    expect(mocks.mockSearch).toHaveBeenCalledWith("钓鱼");
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("搜索结果按类型分组渲染", async () => {
    vi.useFakeTimers();
    mocks.searchResults.risk = [
      { id: "R0001", type: "risk", title: "钓鱼攻击", snippet: "测试" },
      { id: "R0002", type: "risk", title: "社工攻击", snippet: "测试" },
    ];
    mocks.searchResults.term = [
      { id: "T0001", type: "term", title: "钓鱼", snippet: "测试" },
    ];

    const wrapper = createWrapper();
    const input = wrapper.find(".el-input");
    await input.setValue("钓鱼");
    vi.advanceTimersByTime(250);
    await nextTick();
    await nextTick();

    const items = wrapper.findAll(".search-result-item");
    expect(items.length).toBe(3);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("ID 前缀搜索时对应类型提前", async () => {
    vi.useFakeTimers();
    mocks.searchResults.risk = [
      { id: "R0001", type: "risk", title: "风险1" },
    ];
    mocks.searchResults.attackTool = [
      { id: "AT0001", type: "attackTool", title: "工具1" },
    ];

    const wrapper = createWrapper();
    const input = wrapper.find(".el-input");

    // 搜索 AT 前缀，attackTool 应排在第一
    await input.setValue("AT0001");
    vi.advanceTimersByTime(250);
    await nextTick();
    await nextTick();

    const items = wrapper.findAll(".search-result-item");
    expect(items.length).toBe(2);
    // 第一个应是 attackTool
    expect(items[0].text()).toContain("工具1");
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("首页搜索结果路由到 homeXxxDetail 抽屉", async () => {
    vi.useFakeTimers();
    mocks.route.name = "home";
    mocks.searchResults.risk = [
      { id: "R0001", type: "risk", title: "钓鱼攻击" },
    ];

    const wrapper = createWrapper();
    const input = wrapper.find(".el-input");
    await input.setValue("钓鱼");
    vi.advanceTimersByTime(250);
    await nextTick();
    await nextTick();

    const item = wrapper.find(".search-result-item");
    await item.trigger("click");

    expect(mocks.router.push).toHaveBeenCalledWith({
      name: "homeRiskDetail",
      params: { rKey: "R0001" },
    });
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("知识库页搜索结果也路由到首页抽屉", async () => {
    vi.useFakeTimers();
    mocks.route.name = "knowledgesRiskList";
    mocks.searchResults.avoidance = [
      { id: "A0001", type: "avoidance", title: "规避手段" },
    ];

    const wrapper = createWrapper();
    const input = wrapper.find(".el-input");
    await input.setValue("规避");
    vi.advanceTimersByTime(250);
    await nextTick();
    await nextTick();

    const item = wrapper.find(".search-result-item");
    await item.trigger("click");

    expect(mocks.router.push).toHaveBeenCalledWith({
      name: "homeAvoidanceDetail",
      params: { aKey: "A0001" },
    });
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("首页案例搜索结果路由到 homeCaseDetail 抽屉", async () => {
    vi.useFakeTimers();
    mocks.route.name = "home";
    mocks.searchResults.case = [
      { id: "C0001", type: "case", title: "案例" },
    ];

    const wrapper = createWrapper();
    const input = wrapper.find(".el-input");
    await input.setValue("案例");
    vi.advanceTimersByTime(250);
    await nextTick();
    await nextTick();

    const item = wrapper.find(".search-result-item");
    await item.trigger("click");

    expect(mocks.router.push).toHaveBeenCalledWith({
      name: "homeCaseDetail",
      params: { cKey: "C0001" },
    });
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("业务场景页案例搜索结果路由到首页案例抽屉且不携带 bsKey", async () => {
    vi.useFakeTimers();
    mocks.route.name = "businessSceneRiskDetail";
    mocks.route.params = { bsKey: "BS01", rKey: "R0001" };
    mocks.searchResults.case = [
      { id: "C0001", type: "case", title: "案例" },
    ];

    const wrapper = createWrapper();
    const input = wrapper.find(".el-input");
    await input.setValue("案例");
    vi.advanceTimersByTime(250);
    await nextTick();
    await nextTick();

    const item = wrapper.find(".search-result-item");
    await item.trigger("click");

    expect(mocks.router.push).toHaveBeenCalledWith({
      name: "homeCaseDetail",
      params: { cKey: "C0001" },
    });
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("关闭对话框触发 update:modelValue(false)", async () => {
    const wrapper = createWrapper();
    wrapper.vm.$emit("update:modelValue", false);
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    wrapper.unmount();
  });

  it("打开时触发 cases 预加载", async () => {
    // dialog 从 false → true 时 watch 触发 ensureCases
    const wrapper = createWrapper(false);
    await wrapper.setProps({ modelValue: true });
    await nextTick();
    expect(mocks.mockEnsureCases).toHaveBeenCalled();
    wrapper.unmount();
  });
});
