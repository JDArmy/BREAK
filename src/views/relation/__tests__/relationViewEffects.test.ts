import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, reactive, ref } from "vue";
import { mount } from "@vue/test-utils";
import { setupRelationViewEffects } from "../relationViewEffects";
import {
  createRelationTypeMapping,
  RelationType,
  type RelationEntityType,
} from "../relationTypes";
import type { RelationViewMode } from "../relationViewState";

const { ElMessage } = vi.hoisted(() => ({
  ElMessage: vi.fn(),
}));

vi.mock("element-plus", () => ({
  ElMessage,
}));

const flushTicks = async () => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

const createHarness = (options?: {
  activeView?: RelationViewMode;
  routeType?: string;
  routeKey?: string;
}) => {
  const route = reactive({
    params: {
      type: options?.routeType ?? RelationType.risk,
      key: options?.routeKey ?? "R0001",
    },
    query: {} as Record<string, unknown>,
  });
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
  };
  const locale = ref("zh-CN");
  const isDark = ref(false);
  const activeView = ref<RelationViewMode>(options?.activeView ?? "network");
  const relType = ref(route.params.type as RelationType);
  const relKey = ref(route.params.key);
  const getCurrentEntityOptions = ref<Record<string, unknown>>({
    R0001: {},
    R0002: {},
  });
  const selectedNetworkNodeId = ref(route.params.key);
  const calls = {
    addRootNode: vi.fn(),
    disposeNetworkChart: vi.fn(),
    disposeSankeyChart: vi.fn(),
    disposePathExplorerSankeyChart: vi.fn(),
    genNetworkGraphData: vi.fn(),
    handleGlobalPointerDown: vi.fn(),
    hideNetworkTooltip: vi.fn(),
    hidePathExplorerSankeyTooltip: vi.fn(),
    hideSankeyTooltip: vi.fn(),
    normalizeAttackPathFilters: vi.fn(),
    rebuildGraphData: vi.fn(),
    recreateNetworkChart: vi.fn(),
    refreshGraphAfterVisible: vi.fn(),
    renderNetworkChart: vi.fn(),
    renderPathExplorerSankeyChart: vi.fn(),
    renderSankeyChart: vi.fn(),
    resizeNetworkChart: vi.fn(),
    resizePathExplorerSankeyChart: vi.fn(),
    resizeSankeyChart: vi.fn(),
    updateNetworkSelection: vi.fn(),
    updatePathExplorerSankeyTheme: vi.fn(),
    updateSankeyTheme: vi.fn(),
  };
  const RelationTypeMapping = createRelationTypeMapping(
    (key) => `t:${key}`,
    (type: RelationEntityType) => `color:${type}`,
  );
  const wrapper = mount(
    defineComponent({
      setup() {
        setupRelationViewEffects({
          t: (key) => `t:${key}`,
          route: route as never,
          router: router as never,
          locale,
          isDark,
          activeView,
          relType,
          relKey,
          getCurrentEntityOptions,
          RelationTypeMapping,
          selectedNetworkNodeId,
          ...calls,
        });
        return () => null;
      },
    }),
  );

  return {
    activeView,
    calls,
    getCurrentEntityOptions,
    isDark,
    locale,
    relKey,
    relType,
    route,
    router,
    selectedNetworkNodeId,
    wrapper,
  };
};

describe("relationViewEffects", () => {
  beforeEach(() => {
    ElMessage.mockReset();
    vi.spyOn(window, "addEventListener");
    vi.spyOn(window, "removeEventListener");
    vi.spyOn(document, "addEventListener");
    vi.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects invalid route params and initializes after params become valid", async () => {
    const { calls, route, router } = createHarness({
      routeType: RelationType.risk,
      routeKey: "R9999",
    });

    expect(ElMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: "t:unknownTypeOrId", type: "warning" }),
    );
    expect(router.replace).toHaveBeenCalledWith({
      name: "relation",
      params: { type: "risk", key: "R0001" },
      query: route.query,
    });
    expect(calls.addRootNode).not.toHaveBeenCalled();

    route.params.key = "R0001";
    await flushTicks();

    expect(calls.addRootNode).toHaveBeenCalledTimes(1);
    expect(calls.genNetworkGraphData).toHaveBeenCalledWith(
      RelationType.all,
      RelationType.risk,
      "R0001",
      { render: false },
    );
    expect(calls.renderNetworkChart).toHaveBeenCalledWith(false);
  });

  it("initializes and cleans up network view listeners and charts", () => {
    const { calls, wrapper } = createHarness({ activeView: "network" });

    expect(calls.addRootNode).toHaveBeenCalledTimes(1);
    expect(calls.renderNetworkChart).toHaveBeenCalledWith(false);
    expect(calls.renderSankeyChart).not.toHaveBeenCalled();
    expect(window.addEventListener).toHaveBeenCalledWith("resize", calls.resizeNetworkChart);
    expect(window.addEventListener).toHaveBeenCalledWith("resize", calls.resizeSankeyChart);
    expect(document.addEventListener).toHaveBeenCalledWith(
      "pointerdown",
      calls.handleGlobalPointerDown,
    );

    wrapper.unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      "resize",
      calls.resizeNetworkChart,
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "resize",
      calls.resizeSankeyChart,
    );
    expect(document.removeEventListener).toHaveBeenCalledWith(
      "pointerdown",
      calls.handleGlobalPointerDown,
    );
    expect(calls.disposeNetworkChart).toHaveBeenCalled();
    expect(calls.disposeSankeyChart).toHaveBeenCalled();
  });

  it("initializes sankey and analysis views with their specific render paths", () => {
    const sankey = createHarness({ activeView: "sankey" });
    expect(sankey.calls.addRootNode).toHaveBeenCalledTimes(1);
    expect(sankey.calls.renderSankeyChart).toHaveBeenCalledTimes(1);
    expect(sankey.calls.genNetworkGraphData).not.toHaveBeenCalled();
    sankey.wrapper.unmount();

    const analysis = createHarness({ activeView: "analysis" });
    expect(analysis.calls.addRootNode).toHaveBeenCalledTimes(1);
    expect(analysis.calls.genNetworkGraphData).toHaveBeenCalledWith(
      RelationType.all,
      RelationType.risk,
      "R0001",
      { render: false },
    );
    expect(analysis.calls.renderNetworkChart).not.toHaveBeenCalled();
    expect(analysis.calls.renderSankeyChart).not.toHaveBeenCalled();
    analysis.wrapper.unmount();
  });

  it("routes selection changes, synchronizes query view, and refreshes active charts", async () => {
    const { activeView, calls, relKey, route, router, selectedNetworkNodeId } =
      createHarness({ activeView: "network" });
    calls.genNetworkGraphData.mockClear();
    calls.renderNetworkChart.mockClear();

    relKey.value = "R0002";
    await flushTicks();

    expect(selectedNetworkNodeId.value).toBe("R0002");
    expect(router.push).toHaveBeenCalledWith({
      name: "relation",
      params: { type: RelationType.risk, key: "R0002" },
      query: route.query,
    });

    activeView.value = "sankey";
    await flushTicks();

    expect(router.replace).toHaveBeenCalledWith({
      name: "relation",
      params: { type: RelationType.risk, key: "R0002" },
      query: { view: "sankey" },
    });
    expect(calls.hideNetworkTooltip).toHaveBeenCalled();
    expect(calls.hideSankeyTooltip).toHaveBeenCalled();
    expect(calls.renderSankeyChart).toHaveBeenCalled();

    route.query.view = "analysis";
    await flushTicks();

    expect(activeView.value).toBe("analysis");
    expect(calls.hideNetworkTooltip).toHaveBeenCalledTimes(2);
    expect(calls.hideSankeyTooltip).toHaveBeenCalledTimes(2);

    activeView.value = "pathExplorer";
    await flushTicks();

    expect(router.replace).toHaveBeenCalledWith({
      name: "relation",
      params: { type: RelationType.risk, key: "R0002" },
      query: { view: "pathExplorer" },
    });
    expect(calls.hidePathExplorerSankeyTooltip).toHaveBeenCalled();
    expect(calls.renderPathExplorerSankeyChart).toHaveBeenCalled();
  });

  it("rebuilds data on route, locale, theme, and selected node changes", async () => {
    const {
      activeView,
      calls,
      isDark,
      locale,
      route,
      selectedNetworkNodeId,
    } = createHarness({ activeView: "network" });

    route.params.key = "R0002";
    await flushTicks();

    expect(calls.normalizeAttackPathFilters).toHaveBeenCalled();
    expect(calls.refreshGraphAfterVisible).toHaveBeenCalled();

    locale.value = "en";
    await flushTicks();

    expect(calls.rebuildGraphData).toHaveBeenCalledWith({ render: false });
    expect(calls.recreateNetworkChart).toHaveBeenCalled();
    expect(calls.renderNetworkChart).toHaveBeenCalledWith(true);

    activeView.value = "sankey";
    await flushTicks();
    isDark.value = true;
    await flushTicks();

    expect(calls.updateSankeyTheme).toHaveBeenCalled();

    activeView.value = "network";
    await flushTicks();
    selectedNetworkNodeId.value = "R0001";
    await flushTicks();

    expect(calls.updateNetworkSelection).toHaveBeenCalled();
  });

  it("handles route and locale changes for analysis, sankey, and path explorer views", async () => {
    const { activeView, calls, locale, route } = createHarness({
      activeView: "analysis",
    });

    route.params.key = "R0002";
    await flushTicks();

    expect(calls.rebuildGraphData).toHaveBeenCalledWith({ render: false });
    expect(calls.refreshGraphAfterVisible).not.toHaveBeenCalled();

    activeView.value = "sankey";
    await flushTicks();
    locale.value = "en";
    await flushTicks();
    expect(calls.renderSankeyChart).toHaveBeenCalled();

    activeView.value = "pathExplorer";
    await flushTicks();
    locale.value = "zh-CN";
    await flushTicks();
    expect(calls.renderPathExplorerSankeyChart).toHaveBeenCalled();
  });

  it("normalizes invalid query view without changing active view", async () => {
    const { activeView, route } = createHarness({ activeView: "network" });

    route.query.view = "unknown";
    await flushTicks();

    expect(activeView.value).toBe("network");
  });
});
