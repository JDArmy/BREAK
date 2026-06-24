import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  createRelationViewState,
  normalizeRelationViewMode,
} from "../relationViewState";
import { normalizeRelationAnalysisPerspective } from "../relationAnalysisPerspectives";
import { RelationType, type NetworkLayoutMode, type SankeyNode } from "../relationTypes";

const createRoute = (options?: {
  type?: RelationType;
  key?: string;
  perspective?: unknown;
  view?: unknown;
}) =>
  ({
    params: {
      type: options?.type ?? RelationType.risk,
      key: options?.key ?? "R0001",
    },
    query: {
      perspective: options?.perspective,
      view: options?.view,
    },
  }) as never;

const createState = (options?: {
  isMobile?: boolean;
  width?: number;
  view?: unknown;
  perspective?: unknown;
}) => {
  const renderNetworkChart = vi.fn();
  const state = createRelationViewState({
    route: createRoute({
      perspective: options?.perspective,
      view: options?.view,
    }),
    t: (key) => `t:${key}`,
    isMobile: ref(options?.isMobile ?? false),
    width: ref(options?.width ?? 1200),
    renderNetworkChartBridge: { current: renderNetworkChart },
  });

  return { renderNetworkChart, state };
};

describe("relationViewState", () => {
  it("normalizes analysis perspectives and falls back for invalid query values", () => {
    expect(normalizeRelationAnalysisPerspective("attackPath")).toBe(
      "attackPath",
    );
    expect(normalizeRelationAnalysisPerspective("defenseCoverage")).toBe(
      "defenseCoverage",
    );
    expect(normalizeRelationAnalysisPerspective("unknown", "risk")).toBe(
      "risk",
    );
    expect(normalizeRelationAnalysisPerspective(["risk"], "attackPath")).toBe(
      "attackPath",
    );
  });

  it("normalizes view modes and falls back for invalid route query values", () => {
    expect(normalizeRelationViewMode("sankey", "network")).toBe("sankey");
    expect(normalizeRelationViewMode("analysis", "network")).toBe("analysis");
    expect(normalizeRelationViewMode("unknown", "network")).toBe("network");
    expect(normalizeRelationViewMode(["sankey"], "network")).toBe("network");
  });

  it("uses responsive default active view when route query does not provide a valid view", () => {
    expect(createState({ isMobile: false, view: undefined }).state.activeView.value).toBe("network");
    expect(createState({ isMobile: true, view: undefined }).state.activeView.value).toBe("sankey");
    expect(createState({ isMobile: true, view: "analysis" }).state.activeView.value).toBe("analysis");
  });

  it("uses risk analysis perspective by default and accepts query perspective", () => {
    expect(createState().state.activeAnalysisPerspective.value).toBe("risk");
    expect(
      createState({ perspective: "defenseCoverage" }).state
        .activeAnalysisPerspective.value,
    ).toBe("defenseCoverage");
    expect(
      createState({ perspective: "invalid" }).state
        .activeAnalysisPerspective.value,
    ).toBe("risk");
  });

  it("computes network layout label and tooltip from the selected layout", () => {
    const { state } = createState();

    expect(state.networkLayoutTooltip.value).toBe("t:toolbar.layout: t:relationLayout.horizontal");

    state.handleNetworkLayoutCommand("radial");

    expect(state.networkState.layout).toBe("radial");
    expect(state.networkLayoutTooltip.value).toBe("t:toolbar.layout: t:relationLayout.radial");
  });

  it("updates relation target when selecting a Sankey node", () => {
    const { state } = createState();
    const node: SankeyNode = {
      name: "AT0001",
      entityType: RelationType.attackTool,
      entityKey: "AT0001",
      itemStyle: { color: "#111" },
    };

    state.selectSankeyNode(node);

    expect(state.relType.value).toBe(RelationType.attackTool);
    expect(state.relKey.value).toBe("AT0001");
  });

  it("applies mobile Sankey sizing and desktop fallbacks", () => {
    const desktop = createState({ isMobile: false, width: 1200 }).state;
    expect(desktop.sankeyChartMinWidth.value).toBe(0);
    expect(desktop.sankeyLeft.value).toBe(40);
    expect(desktop.sankeyRight.value).toBe(280);
    expect(desktop.sankeyLabelWidth.value).toBe(220);
    expect(desktop.sankeyNodeAlign.value).toBe("justify");
    expect(desktop.sankeyLayoutIterations.value).toBe(48);

    const narrowDesktop = createState({ isMobile: false, width: 900 }).state;
    expect(narrowDesktop.sankeyRight.value).toBe(160);
    expect(narrowDesktop.sankeyLabelWidth.value).toBe(160);

    const mobile = createState({ isMobile: true, width: 390 }).state;
    expect(mobile.sankeyChartMinWidth.value).toBe(1014);
    expect(mobile.sankeyLeft.value).toBe(14);
    expect(mobile.sankeyRight.value).toBe(284);
    expect(mobile.sankeyLabelWidth.value).toBe(304);
    expect(mobile.sankeyNodeAlign.value).toBe("left");
    expect(mobile.sankeyLayoutIterations.value).toBe(0);
  });

  it("clamps network zoom and requests chart rerendering", () => {
    const { renderNetworkChart, state } = createState();

    state.zoomNetworkChart(10);
    expect(state.networkState.zoom).toBe(3);
    expect(renderNetworkChart).toHaveBeenLastCalledWith(true);

    state.zoomNetworkChart(-10);
    expect(state.networkState.zoom).toBe(0.12);
    expect(renderNetworkChart).toHaveBeenCalledTimes(2);
  });

  it("changes valid network layouts and ignores invalid commands", () => {
    const { renderNetworkChart, state } = createState();
    const clearDraggedNodePositions = vi.fn();
    state.setClearDraggedNodePositions(clearDraggedNodePositions);

    state.handleNetworkLayoutCommand("force" satisfies NetworkLayoutMode);

    expect(state.networkState.layout).toBe("force");
    expect(state.networkState.zoom).toBeGreaterThan(0);
    expect(clearDraggedNodePositions).toHaveBeenCalledTimes(1);
    expect(renderNetworkChart).toHaveBeenCalledWith(true);

    state.handleNetworkLayoutCommand("invalid");
    expect(state.networkState.layout).toBe("force");
    expect(clearDraggedNodePositions).toHaveBeenCalledTimes(1);
  });

  it("refreshes the network chart without changing state", () => {
    const { renderNetworkChart, state } = createState();

    state.refreshNetworkChart();

    expect(renderNetworkChart).toHaveBeenCalledWith(true);
    expect(state.networkState.layout).toBe("horizontal");
  });
});
