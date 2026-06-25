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
    name: "knowledgesRiskList",
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
      routeName: "knowledgesRiskList",
      detailRouteName: "knowledgesRiskDetail",
      paramKey: "rKey",
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

const mountViewWithAnchor = () =>
  mount(KnowledgeSplitView, {
    props: {
      title: "风险",
      routeName: "knowledgesRiskList",
      detailRouteName: "knowledgesRiskDetail",
      paramKey: "rKey",
      items,
      selectedKey: "R0001",
      searchPlaceholder: "搜索风险",
    },
    slots: {
      default:
        '<div><section data-detail-anchor="cases">相关案例</section><section>详情 R0001</section></div>',
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
    mocks.route.name = "knowledgesRiskList";
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

  it("查询无匹配项时展示空结果提示", async () => {
    const wrapper = mountView();

    await wrapper.find(".el-input-stub").setValue("不存在的风险");

    expect(wrapper.find(".knowledge-empty").text()).toBe("search.noResults");
    expect(wrapper.findAll(".knowledge-list-item")).toHaveLength(0);
  });

  it("初始路由参数指向有效条目时发出选择事件", () => {
    mocks.route.params = { rKey: "R0002" };

    const wrapper = mountView("R0001");

    expect(wrapper.emitted("select")?.[0]).toEqual(["R0002"]);
  });

  it("初始路由参数无效时不发出选择事件", () => {
    mocks.route.params = { rKey: "R9999" };

    const wrapper = mountView("R0001");

    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("点击桌面列表项时发出选择事件并跳转详情路由", async () => {
    const wrapper = mountView();

    await wrapper.find('[data-knowledge-key="R0002"]').trigger("click");

    expect(wrapper.emitted("select")?.[0]).toEqual(["R0002"]);
    expect(mocks.router.push).toHaveBeenCalledWith({
      name: "knowledgesRiskDetail",
      params: { rKey: "R0002" },
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
      name: "knowledgesRiskDetail",
      params: { rKey: "R0002" },
    });
  });

  it("移动端没有详情路由名时点击列表项仅切换到详情态", async () => {
    mocks.isMobile.value = true;
    const wrapper = mount(KnowledgeSplitView, {
      props: {
        title: "风险",
        routeName: "unknown",
        paramKey: "rKey",
        items,
        selectedKey: "R0001",
        searchPlaceholder: "搜索风险",
      },
      slots: {
        default: ({ selectedKey: key }: { selectedKey: string }) => `详情 ${key}`,
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs: {
          ElInput: {
            props: ["modelValue", "placeholder"],
            emits: ["update:modelValue"],
            template:
              '<input class="el-input-stub" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElButton: {
            emits: ["click"],
            template: '<button type="button" class="button-stub" @click="$emit(\'click\', $event)"><slot /></button>',
          },
          ElIcon: { template: "<span><slot /></span>" },
          ArrowLeft: { template: "<span />" },
        },
      },
    });
    await nextTick();

    await wrapper.find('[data-knowledge-key="R0002"]').trigger("click");

    expect(wrapper.emitted("select")?.[0]).toEqual(["R0002"]);
    expect(mocks.router.push).not.toHaveBeenCalled();
    expect(wrapper.find(".knowledge-mobile-detail-header").exists()).toBe(true);

    await wrapper.find(".back-button").trigger("click");
    expect(wrapper.find(".knowledge-mobile-sidebar").exists()).toBe(true);
  });

  it("移动端初始详情参数有效时进入详情态并可返回列表路由", async () => {
    mocks.isMobile.value = true;
    mocks.route.params = { rKey: "R0002" };
    const wrapper = mountView("R0001");
    await nextTick();

    expect(wrapper.emitted("select")?.[0]).toEqual(["R0002"]);
    expect(wrapper.find(".knowledge-mobile-detail-header").exists()).toBe(true);

    await wrapper.find(".back-button").trigger("click");

    expect(mocks.router.push).toHaveBeenCalledWith({ name: "knowledgesRiskList" });
  });

  it("移动端路由参数无效且处于列表路由时保持列表态", async () => {
    mocks.isMobile.value = true;
    mocks.route.params = { rKey: "R9999" };
    mocks.route.name = "knowledgesRiskList";

    const wrapper = mountView("R0001");
    await nextTick();

    expect(wrapper.emitted("select")).toBeUndefined();
    expect(wrapper.find(".knowledge-mobile-sidebar").exists()).toBe(true);
  });

  it("存在 detailAnchor 查询参数时滚动到详情锚点", async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    mocks.route.query = { detailAnchor: "cases" };

    mountViewWithAnchor();
    await nextTick();
    await nextTick();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
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

  it("点击不存在的条目不会发出选择事件或更新路由", async () => {
    const wrapper = mountView();

    await wrapper.vm.$.exposed;
    await wrapper.find('[data-knowledge-key="R0001"]').trigger("click");
    mocks.router.replace.mockClear();
    await wrapper.setProps({ items: [] });
    await nextTick();

    expect(wrapper.find('[data-knowledge-key="R0001"]').exists()).toBe(false);
    expect(mocks.router.replace).not.toHaveBeenCalled();
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

  it("移动端不会启动桌面分隔条拖拽", async () => {
    mocks.isMobile.value = true;
    const addSpy = vi.spyOn(window, "addEventListener");
    const wrapper = mountView();
    await nextTick();

    expect(wrapper.find(".knowledge-splitter").exists()).toBe(false);

    wrapper.unmount();
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
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

  it("窗口缩小时将已展开侧栏限制到最大宽度", async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 2000,
    });
    localStorage.setItem("break-knowledge-sidebar-width", "560");
    const wrapper = mountView();
    expect(wrapper.find<HTMLElement>(".knowledge-sidebar").element.style.width).toBe("560px");

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 600,
    });
    window.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(200);
    await nextTick();

    expect(wrapper.find<HTMLElement>(".knowledge-sidebar").element.style.width).toBe("360px");
    vi.useRealTimers();
  });
});
