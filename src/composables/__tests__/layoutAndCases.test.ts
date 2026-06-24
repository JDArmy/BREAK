import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";

const createLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
};

describe("布局与案例 composables", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("vue");
    vi.doUnmock("vue-router");
    vi.doUnmock("@/composables/useBreakpoints");
    vi.doUnmock("@/composables/useCases");
    vi.doUnmock("@/views/RisksView.vue");
    vi.doUnmock("@/views/AvoidancesView.vue");
    vi.doUnmock("@/views/AttackToolsView.vue");
    vi.doUnmock("@/views/ThreatActorsView.vue");
    vi.doUnmock("@/views/TermsView.vue");
    vi.doUnmock("@/views/CasesView.vue");
    document.documentElement.className = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const setWindowWidth = (width: number) => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
    window.dispatchEvent(new Event("resize"));
  };

  it("useBreakpoints 跟随 resize 更新断点状态并在卸载时清理监听", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    setWindowWidth(360);
    const { useBreakpoints } = await import("@/composables/useBreakpoints");
    let breakpoints!: ReturnType<typeof useBreakpoints>;
    const Host = defineComponent({
      setup() {
        breakpoints = useBreakpoints();
        return () => null;
      },
    });

    const wrapper = mount(Host);

    expect(breakpoints.width.value).toBe(360);
    expect(breakpoints.isXs.value).toBe(true);
    expect(breakpoints.isMobile.value).toBe(true);
    expect(breakpoints.isDesktop.value).toBe(false);
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    setWindowWidth(820);
    await nextTick();
    expect(breakpoints.isMd.value).toBe(true);
    expect(breakpoints.isTablet.value).toBe(true);

    setWindowWidth(1280);
    await nextTick();
    expect(breakpoints.isXl.value).toBe(true);
    expect(breakpoints.isDesktop.value).toBe(true);

    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("useDrawerWidth 根据断点返回外层与内层抽屉宽度", async () => {
    const isMobile = { value: false };
    const isTablet = { value: false };
    vi.doMock("@/composables/useBreakpoints", () => ({
      useBreakpoints: () => ({ isMobile, isTablet }),
    }));
    const { useDrawerWidth } = await import("@/composables/useDrawerWidth");
    const { getDrawerWidth, getInnerDrawerWidth } = useDrawerWidth();

    expect(getDrawerWidth()).toBe("600px");
    expect(getInnerDrawerWidth()).toBe("450px");

    isTablet.value = true;
    expect(getDrawerWidth()).toBe("70vw");
    expect(getInnerDrawerWidth()).toBe("55vw");

    isMobile.value = true;
    expect(getDrawerWidth()).toBe("100%");
    expect(getInnerDrawerWidth()).toBe("100%");
  });

  it("useCasesByRisk 基于懒加载案例数据建立三类倒排索引", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const cases = vue.ref({
      C0001: {
        relatedRisks: ["R0001", "R0002"],
        relatedAttackTools: ["AT0001"],
        relatedThreatActors: ["TA0001"],
      },
      C0002: {
        relatedRisks: ["R0001"],
        relatedAttackTools: ["AT0002"],
      },
      C0003: {
        relatedThreatActors: ["TA0001", "TA0002"],
      },
    });
    const ensureCases = vi.fn(async () => {});
    const loaded = vue.ref(true);
    vi.doMock("@/composables/useCases", () => ({
      useCases: () => ({ cases, ensureCases, loaded }),
    }));

    const { useCasesByRisk } = await import("@/composables/useCasesByRisk");
    const index = useCasesByRisk();

    expect(index.getCasesByRisk("R0001")).toEqual(["C0001", "C0002"]);
    expect(index.getCasesByAttackTool("AT0001")).toEqual(["C0001"]);
    expect(index.getCasesByThreatActor("TA0001")).toEqual(["C0001", "C0003"]);
    expect(index.getCasesByRisk("R9999")).toEqual([]);

    cases.value = {
      C0004: {
        relatedRisks: ["R0003"],
      },
    };
    await nextTick();
    expect(index.getCasesByRisk("R0001")).toEqual([]);
    expect(index.getCasesByRisk("R0003")).toEqual(["C0004"]);
  });

  it("useLazyCasesSection 进入详情滚动容器时只触发一次并在卸载时清理", async () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    let callback!: IntersectionObserverCallback;
    const IntersectionObserverMock = vi.fn(function (
      this: IntersectionObserver,
      cb: IntersectionObserverCallback,
    ) {
      callback = cb;
      this.observe = observe;
      this.disconnect = disconnect;
    });
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    const trigger = vi.fn();
    const { useLazyCasesSection } = await import("@/composables/useLazyCasesSection");
    let sectionRef!: ReturnType<typeof useLazyCasesSection>["sectionRef"];
    const Host = defineComponent({
      setup() {
        sectionRef = useLazyCasesSection(trigger).sectionRef;
        return () => null;
      },
    });
    const wrapper = mount(Host, {
      attachTo: document.body,
      template: '<div class="knowledge-detail"><section id="cases-section"></section></div>',
    });
    const root = document.createElement("div");
    root.className = "knowledge-detail";
    const el = document.createElement("section");
    root.appendChild(el);
    document.body.appendChild(root);

    sectionRef.value = el;
    await nextTick();
    await nextTick();

    expect(IntersectionObserverMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ root, rootMargin: "0px 0px 200px 0px" }),
    );
    expect(observe).toHaveBeenCalledWith(el);

    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    root.remove();
  });

  it("useRelationGraph 以指定实体类型跳转到关系图路由", async () => {
    const push = vi.fn();
    vi.doMock("vue-router", () => ({
      useRouter: () => ({ push }),
    }));
    const { useRelationGraph } = await import("@/composables/useRelationGraph");

    useRelationGraph("attack-tool").openRelationGraph("AT0001");

    expect(push).toHaveBeenCalledWith({
      name: "relation",
      params: { type: "attack-tool", key: "AT0001" },
    });
  });
});
