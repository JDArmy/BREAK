import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";

// happy-dom 在 Node 26 下未稳定注入 localStorage，统一用内存实现打桩
const createMemoryLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
};


const mocks = vi.hoisted(() => {
  const isMobile = { value: false, __v_isRef: true };
  const route = {
    hash: "",
    params: {} as Record<string, string>,
    query: {} as Record<string, string>,
    name: "risks",
  };
  return {
    isMobile,
    route,
    router: {
      push: vi.fn(),
      replace: vi.fn(),
    },
  };
});

vi.mock("element-plus/es/components/button/style/css", () => ({}));

vi.mock("@/composables/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: mocks.isMobile }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}));

vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
  callback(0);
  return 0;
});

const items = [
  { id: "R0001", title: "流程自动化", subtitle: "自动化请求", searchText: "automation" },
  { id: "R0002", title: "账号盗用", subtitle: "Account takeover", searchText: "ato" },
];

const mountView = (selectedKey = "R0001") =>
  mount(KnowledgeSplitView, {
    props: {
      title: "风险",
      routeName: "risks",
      detailRouteName: "riskDetail",
      items,
      selectedKey,
      searchPlaceholder: "搜索风险",
    },
    slots: {
      default: ({ selectedKey: key }: { selectedKey: string }) => `详情 ${key}`,
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        ElInput: {
          props: ["modelValue", "placeholder"],
          emits: ["update:modelValue"],
          template:
            '<input class="el-input-stub" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        ElButton: {
          emits: ["click"],
          template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        ElIcon: { template: "<span><slot /></span>" },
        ArrowLeft: { template: "<span />" },
      },
    },
  });

describe("KnowledgeSplitView", () => {
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    mocks.isMobile.value = false;
    mocks.route.hash = "";
    mocks.route.params = {};
    mocks.route.query = {};
    mocks.route.name = "risks";
    mocks.router.push.mockClear();
    mocks.router.replace.mockClear();
    // happy-dom 在 Node 26 下未注入 localStorage，直接挂到 window 供组件读写，
    // 不走 vi.stubGlobal 以免影响 happy-dom 的 rAF/布局调度时序
    originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      value: createMemoryLocalStorage(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalLocalStorage === undefined) {
      delete (window as Partial<Window>).localStorage;
    } else {
      Object.defineProperty(window, "localStorage", {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      });
    }
  });

  it("按查询词过滤列表并保留详情插槽", async () => {
    const wrapper = mountView();

    await wrapper.find(".el-input-stub").setValue("ato");

    expect(wrapper.text()).toContain("账号盗用");
    expect(wrapper.text()).not.toContain("流程自动化");
    expect(wrapper.text()).toContain("详情 R0001");
  });

  it("点击桌面列表项时发出选择事件并更新 hash", async () => {
    const wrapper = mountView();

    await wrapper.find('[data-knowledge-key="R0002"]').trigger("click");

    expect(wrapper.emitted("select")?.[0]).toEqual(["R0002"]);
    expect(mocks.router.replace).toHaveBeenCalledWith({
      name: "risks",
      hash: "#R0002",
    });
  });

  it("切换选中项时重置详情滚动位置", async () => {
    const wrapper = mountView();
    const detail = wrapper.find<HTMLElement>(".knowledge-detail").element;
    detail.scrollTop = 240;

    await wrapper.setProps({ selectedKey: "R0002" });
    await nextTick();
    await nextTick();

    expect(detail.scrollTop).toBe(0);
  });

  it("移动端点击列表项时进入详情路由", async () => {
    mocks.isMobile.value = true;
    const wrapper = mountView();
    await nextTick();

    await wrapper.find('[data-knowledge-key="R0002"]').trigger("click");

    expect(wrapper.emitted("select")?.[0]).toEqual(["R0002"]);
    expect(mocks.router.push).toHaveBeenCalledWith({
      name: "riskDetail",
      params: { rKey: "R0002" },
    });
  });

  // happy-dom 可能未实现 setPointerCapture，统一打桩避免报错
  const ensurePointerCapture = () => {
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {};
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
  };

  // 模拟拖拽分隔条：pointerdown（组件内元素）→ window pointermove → window pointerup
  const dragSplitter = async (wrapper: ReturnType<typeof mountView>, fromX: number, toX: number) => {
    ensurePointerCapture();
    await wrapper.find(".knowledge-splitter").trigger("pointerdown", { clientX: fromX, pointerId: 1 });
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: toX }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: toX }));
    await nextTick();
  };

  it("默认渲染分隔条且侧栏带 inline 宽度", () => {
    const wrapper = mountView();
    const sidebar = wrapper.find<HTMLElement>(".knowledge-sidebar").element;

    expect(wrapper.find(".knowledge-splitter").exists()).toBe(true);
    expect(sidebar.style.width).not.toBe("");
    expect(sidebar.style.width).toMatch(/px$/);
  });

  it("拖拽增宽后持久化宽度到 localStorage", async () => {
    const wrapper = mountView();

    await dragSplitter(wrapper, 320, 400);

    const stored = localStorage.getItem("break-knowledge-sidebar-width");
    expect(stored).not.toBeNull();
    expect(Number(stored)).toBeGreaterThanOrEqual(240);
    // 侧栏实际宽度与持久化值一致
    const sidebar = wrapper.find<HTMLElement>(".knowledge-sidebar").element;
    expect(Number(sidebar.style.width.replace("px", ""))).toBe(Number(stored));
  });

  it("拖到极值松手后侧栏收起且详情区仍渲染", async () => {
    const wrapper = mountView();

    // 从 320 拖到 100（< 收起阈值 180），松手吸附为 0
    await dragSplitter(wrapper, 320, 100);

    const sidebar = wrapper.find<HTMLElement>(".knowledge-sidebar").element;
    expect(sidebar.style.width).toBe("0px");
    expect(wrapper.find(".knowledge-page").classes()).toContain("is-collapsed");
    // 收起态下详情区与插槽内容仍在 DOM
    expect(wrapper.find(".knowledge-detail").exists()).toBe(true);
    expect(wrapper.text()).toContain("详情 R0001");
    expect(localStorage.getItem("break-knowledge-sidebar-width")).toBe("0");
  });

  it("从收起态拖出可恢复展开", async () => {
    localStorage.setItem("break-knowledge-sidebar-width", "0");
    const wrapper = mountView();
    expect(wrapper.find<HTMLElement>(".knowledge-sidebar").element.style.width).toBe("0px");

    // 从 0 拖到 300（> 最小展开宽度 240），松手吸附展开
    await dragSplitter(wrapper, 0, 300);

    const sidebar = wrapper.find<HTMLElement>(".knowledge-sidebar").element;
    expect(sidebar.style.width).not.toBe("0px");
    expect(Number(sidebar.style.width.replace("px", ""))).toBeGreaterThanOrEqual(240);
    expect(wrapper.find(".knowledge-page").classes()).not.toContain("is-collapsed");
  });
});
