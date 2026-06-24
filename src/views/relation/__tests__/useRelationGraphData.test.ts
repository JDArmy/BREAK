import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { useRelationGraphData } from "../useRelationGraphData";
import {
  createRelationTypeMapping,
  RelationType,
  type Line,
  type Node,
  type RelationEntityType,
} from "../relationTypes";

const {
  createRelationAttackPathData,
  createRelationBusinessSceneImpact,
  createRelationCoverageAnalysis,
  createRelationExplanationHelpers,
  createRelationGraphBuilder,
  createRelationGraphInsights,
} = vi.hoisted(() => ({
  createRelationAttackPathData: vi.fn(),
  createRelationBusinessSceneImpact: vi.fn(),
  createRelationCoverageAnalysis: vi.fn(),
  createRelationExplanationHelpers: vi.fn(),
  createRelationGraphBuilder: vi.fn(),
  createRelationGraphInsights: vi.fn(),
}));

vi.mock("@/views/relation/relationAttackPath", () => ({
  createRelationAttackPathData,
}));

vi.mock("@/views/relation/relationBusinessSceneImpact", () => ({
  createRelationBusinessSceneImpact,
}));

vi.mock("@/views/relation/relationCoverageAnalysis", () => ({
  createRelationCoverageAnalysis,
}));

vi.mock("@/views/relation/relationExplanation", () => ({
  createRelationExplanationHelpers,
}));

vi.mock("@/views/relation/relationGraphBuilder", () => ({
  createRelationGraphBuilder,
}));

vi.mock("@/views/relation/relationGraphInsights", () => ({
  createRelationGraphInsights,
}));

const createGraphData = () => {
  const locale = ref("zh-CN");
  const isDark = ref(false);
  const isMobile = ref(false);
  const relType = ref(RelationType.risk);
  const relKey = ref("R0001");
  const renderNetworkChart = vi.fn();
  const relationLineColors: Record<string, string> = {};

  const graphData = useRelationGraphData({
    t: (key) => `t:${key}`,
    locale,
    isDark,
    isMobile,
    relType,
    relKey,
    RelationTypeMapping: createRelationTypeMapping(
      (key) => `t:${key}`,
      (type: RelationEntityType) => `color:${type}`,
    ),
    getGraphColor: (key) => `graph:${key}`,
    getRelationLineColor: (key) => {
      relationLineColors[key] = `line:${key}`;
      return `line:${key}`;
    },
    renderNetworkChart,
  });

  return { graphData, isMobile, locale, relKey, relType, renderNetworkChart, relationLineColors };
};

describe("useRelationGraphData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createRelationExplanationHelpers.mockReturnValue({
      explainRelation: vi.fn((line: Line) => ({
        evidenceLevel: "direct",
        explanation: line.text,
        fromId: line.from,
        impactHint: "impact",
        qualityFlags: [],
        relationKey: line.relationKey ?? line.text,
        relationType: line.text,
        sourceFields: ["Risk.avoidances"],
        toId: line.to,
      })),
      formatEvidenceLevel: vi.fn((level: string) => `证据:${level}`),
      getRelationPriority: vi.fn(() => 1),
      getRelationSourceFields: vi.fn(() => ["Risk.avoidances"]),
      isDirectRelationLine: vi.fn(() => true),
    });
    createRelationGraphBuilder.mockImplementation(({ nodes, lines, selectedNetworkNodeId }) => ({
      addRootNode: vi.fn(),
      clearDraggedNodePositions: vi.fn(),
      draggedNodePositions: ref({}),
      filterLineType: ref("all"),
      filterRelatedEntity: ref("all"),
      filterRelationType: ref("all"),
      filterSubNode: ref("all"),
      genNetworkGraphData: vi.fn(),
      rebuildGraphData: vi.fn(),
      visibleRelationLegendItems: computed(() => []),
      __nodes: nodes,
      __lines: lines,
      __selectedNetworkNodeId: selectedNetworkNodeId,
    }));
    createRelationGraphInsights.mockImplementation(({ nodes, selectedNetworkNodeId }) => ({
      buildNodeSummary: vi.fn((id: string) => ({
        id,
        isSubNode: false,
        title: `标题 ${id}`,
        type: nodes.find((node: Node) => node.id === id)?.type ?? RelationType.risk,
      })),
      findNodeById: vi.fn((id: string) => nodes.find((node: Node) => node.id === id)),
      isCurrentNodeRoot: computed(() => selectedNetworkNodeId.value === "R0001"),
      rootNodeRelations: computed(() => []),
      selectedNetworkNode: computed(() =>
        nodes.find((node: Node) => node.id === selectedNetworkNodeId.value) ?? null
      ),
      selectedNetworkNodeTitle: computed(() => selectedNetworkNodeId.value),
      selectedNetworkRelationCounts: computed(() => ({ direct: 0, indirect: 0 })),
      selectedNetworkRelations: computed(() => []),
      selectedNodeAnalysisSummary: computed(() => null),
      selectedNodeRelatedEntitySummary: computed(() => null),
      selectedNodeDiscoveredPaths: computed(() => []),
      selectedNodePathRelationKeys: computed(() => new Set(["path-1"])),
      selectedNodeRootPath: computed(() => []),
      selectedNodeRootPreview: computed(() => []),
    }));
    createRelationAttackPathData.mockReturnValue({
      attackPathDetails: computed(() => []),
      attackPathFilterOptions: computed(() => []),
      attackPathFilters: ref({}),
      filteredAttackPaths: computed(() => []),
      hasActiveAttackPathFilters: computed(() => false),
      normalizeAttackPathFilters: vi.fn(),
      resetAttackPathFilters: vi.fn(),
      riskAvoidanceCoverage: computed(() => null),
      sankeyChartHeight: computed(() => 460),
      sankeyData: computed(() => ({ nodes: [], links: [] })),
      selectAttackPath: vi.fn(),
      selectedAttackPathDetail: computed(() => null),
      selectedNodeAttackPathDescription: computed(() => ""),
      selectedNodeAttackPathExplanations: computed(() => []),
      selectedNodeAttackPathSummary: computed(() => null),
    });
    createRelationCoverageAnalysis.mockReturnValue({
      selectedNodeCoverageSummary: computed(() => null),
      selectedNodeSpecialInsightSummary: computed(() => null),
    });
    createRelationBusinessSceneImpact.mockReturnValue({
      selectedNodeBusinessSceneImpactSummary: computed(() => null),
    });
  });

  it("creates relation nodes, labels, type items, and legend items", () => {
    const { graphData, relationLineColors } = createGraphData();

    const node = graphData.ensureRelationNode(RelationType.risk, "R0001");
    const sameNode = graphData.ensureRelationNode(RelationType.risk, "R0001");

    expect(sameNode).toEqual(node);
    expect(graphData.nodes).toHaveLength(1);
    expect(node.text).toContain("R0001");
    expect(node.text).toContain("t:BREAK.risks.R0001.title");
    expect(graphData.getNodeTitle(RelationType.avoidance, "A0001")).toBe(
      "t:BREAK.avoidances.A0001.title",
    );
    expect(graphData.getNodeTypeTitle(RelationType.attackTool)).toBe(
      "t:relationType.attackTool",
    );
    expect(graphData.getNodeTypeTitle("unknown")).toBe("unknown");
    expect(graphData.relationTypeItems.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: RelationType.risk, title: "t:relationType.risk" }),
      ]),
    );
    expect(graphData.relationLegendItems.value[0]).toEqual(
      expect.objectContaining({
        color: "line:avoidanceMeans",
        key: "relationLine.avoidanceMeans",
        label: "t:relationLine.avoidanceMeans",
      }),
    );
    expect(relationLineColors.avoidanceMeans).toBe("line:avoidanceMeans");
  });

  it("escapes relation field tooltip html and wraps labels predictably", () => {
    const { graphData } = createGraphData();

    expect(graphData.formatRelationFieldsTooltip(["A<B", '"quote"', "Tom & Jerry"])).toBe(
      "A&lt;B<br>&quot;quote&quot;<br>Tom &amp; Jerry",
    );
    expect(graphData.wrapLabelText("R0001<br/>Credential Stuffing Attack", 10)).toBe(
      "R0001\nCredential\nStuffing\nAttack",
    );
    expect(graphData.wrapLabelText("R0001\n账号撞库攻击", 4)).toBe(
      "R0001\n账号撞库\n攻击",
    );
    expect(graphData.wrapLabelText("R0001")).toBe("R0001");
  });

  it("schedules visible graph refresh and ignores stale requests", async () => {
    vi.useFakeTimers();
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });
    const { graphData, renderNetworkChart } = createGraphData();
    const builder = createRelationGraphBuilder.mock.results[0].value;

    graphData.refreshGraphAfterVisible();
    graphData.refreshGraphAfterVisible();
    await vi.runAllTimersAsync();

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
    expect(builder.rebuildGraphData).toHaveBeenCalledTimes(1);
    expect(renderNetworkChart).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it("exposes selected path helper state", () => {
    const { graphData } = createGraphData();

    expect(graphData.isPathNodeCurrentSelection("R0001")).toBe(true);
    expect(graphData.isPathNodeCurrentSelection("A0001")).toBe(false);
    expect(graphData.isRelationOnSelectedPath("path-1")).toBe(true);
    expect(graphData.isRelationOnSelectedPath("path-2")).toBe(false);
  });
});
