import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createNetworkDataHelpers } from "../relationNetworkLayout";
import { createRelationGraphInsights } from "../relationGraphInsights";
import {
  RelationType,
  type Line,
  type NetworkLayoutMode,
  type Node,
} from "../relationTypes";

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const createNode = (
  id: string,
  type: Exclude<RelationType, RelationType.all>,
  data?: Node["data"]
): Node => ({
  id,
  type,
  text: id,
  color: "",
  data,
});

const createHighFanOutFixture = () => {
  const root = createNode("ROOT", RelationType.risk);
  const avoidances = Array.from({ length: 18 }, (_, index) =>
    createNode(`A${String(index + 1).padStart(2, "0")}`, RelationType.avoidance)
  );
  const tools = Array.from({ length: 10 }, (_, index) =>
    createNode(`AT${String(index + 1).padStart(2, "0")}`, RelationType.attackTool)
  );
  const actors = Array.from({ length: 8 }, (_, index) =>
    createNode(`TA${String(index + 1).padStart(2, "0")}`, RelationType.threatActor)
  );
  const terms = Array.from({ length: 12 }, (_, index) =>
    createNode(`T${String(index + 1).padStart(2, "0")}`, RelationType.term, {
      isSubNode: index % 2 === 0,
    })
  );
  const nodes = [root, ...avoidances, ...tools, ...actors, ...terms];
  const lines: Line[] = [
    ...avoidances.map((node) => ({
      from: "ROOT",
      relationKey: "relationLine.avoidanceMeans",
      text: "规避手段",
      to: node.id,
    })),
    ...tools.flatMap((node, index) => [
      {
        from: node.id,
        relationKey: "relationLine.directCauseRisk",
        text: "直接导致风险",
        to: "ROOT",
      },
      {
        from: actors[index % actors.length].id,
        relationKey: "relationLine.useAttackTool",
        text: "使用攻击工具",
        to: node.id,
      },
    ]),
    ...actors.map((node) => ({
      from: node.id,
      relationKey: "relationLine.indirectSupportRisk",
      text: "间接支撑风险",
      to: "ROOT",
    })),
    ...terms.map((node) => ({
      from: "ROOT",
      relationKey: "relationLine.relatedTerm",
      text: "关联术语",
      to: node.id,
    })),
  ];

  return { nodes, lines };
};

const createNetworkHelpers = (
  nodes: Node[],
  lines: Line[],
  options?: {
    layout?: NetworkLayoutMode;
    selectedNetworkNodeId?: string;
    filterRelationType?: string[];
    filterSubNode?: boolean;
    filterLineType?: string[];
  }
) =>
  createNetworkDataHelpers({
    nodes,
    lines,
    relKey: ref("ROOT"),
    selectedNetworkNodeId: ref(options?.selectedNetworkNodeId ?? "ROOT"),
    filterRelationType: ref(
      options?.filterRelationType ?? [
        RelationType.risk,
        RelationType.avoidance,
        RelationType.attackTool,
        RelationType.threatActor,
        RelationType.term,
      ]
    ),
    filterSubNode: ref(options?.filterSubNode ?? true),
    filterLineType: ref(
      options?.filterLineType ?? [
        "relationLine.avoidanceMeans",
        "relationLine.directCauseRisk",
        "relationLine.indirectSupportRisk",
        "relationLine.useAttackTool",
        "relationLine.relatedTerm",
      ]
    ),
    draggedNodePositions: ref({}),
    networkState: { layout: options?.layout ?? "horizontal" },
    relationLegendItems: ref([
      { key: "relationLine.avoidanceMeans", color: "#0a0", label: "规避手段" },
      { key: "relationLine.directCauseRisk", color: "#a00", label: "直接导致风险" },
      { key: "relationLine.indirectSupportRisk", color: "#a50", label: "间接支撑风险" },
      { key: "relationLine.useAttackTool", color: "#05a", label: "使用攻击工具" },
      { key: "relationLine.relatedTerm", color: "#50a", label: "关联术语" },
    ]),
    isDark: ref(false),
    getRelationTypeColor: (type) => `color:${type}`,
    wrapLabelText: (text, maxLineLength) => `${text}|${maxLineLength}`,
    getGraphColor: (key) => `graph:${key}`,
    getRelationSourceFields: (line, fromType, toType) => [
      `${fromType}->${toType}:${line.relationKey ?? line.text}`,
    ],
    explainRelation: (line, fromType, toType) => ({
      relationKey: `${line.from}::${line.relationKey ?? line.text}::${line.to}`,
      fromId: line.from,
      toId: line.to,
      relationType: line.text,
      sourceFields: [`${fromType}->${toType}:${line.relationKey ?? line.text}`],
      evidenceLevel: line.relationKey === "relationLine.directCauseRisk" ? "direct" : "indirect",
      explanation: `explain:${line.relationKey ?? line.text}`,
      impactHint: `impact:${line.relationKey ?? line.text}`,
      qualityFlags: [],
    }),
    formatEvidenceLevel: (level) => `evidence:${level}`,
    getNodeTypeTitle: (type) => `type:${type}`,
  });

const createInsights = (nodes: Node[], lines: Line[], selectedNetworkNodeId: string) =>
  createRelationGraphInsights({
    t,
    relKey: ref("ROOT"),
    nodes,
    lines,
    selectedNetworkNodeId: ref(selectedNetworkNodeId),
    getNodeTitle: (type, key) => `${type}:${key}`,
    getNodeTypeTitle: (type) => `type:${type}`,
    getRelationPriority: (lineText) =>
      lineText === "直接导致风险" ? 1 : lineText === "使用攻击工具" ? 2 : 9,
    isDirectRelationLine: (lineText) => lineText === "直接导致风险",
    getRelationSourceFields: (line) => [`source:${line.relationKey ?? line.text}`],
    explainRelation: (line) => ({
      evidenceLevel: line.text === "直接导致风险" ? "direct" : "indirect",
      explanation: `explain:${line.text}`,
      impactHint: `impact:${line.text}`,
      qualityFlags: [],
    }),
    formatEvidenceLevel: (level) => `evidence:${level}`,
  });

describe("relation edge fixtures", () => {
  it("keeps an isolated root node renderable and reports low connectivity", () => {
    const nodes = [createNode("ROOT", RelationType.risk)];
    const lines: Line[] = [];
    const visibleData = createNetworkHelpers(nodes, lines).getVisibleNetworkData();
    const insights = createInsights(nodes, lines, "ROOT");

    expect(visibleData.nodes).toEqual([
      expect.objectContaining({
        id: "ROOT",
        fixed: true,
        x: 0,
        y: 0,
      }),
    ]);
    expect(visibleData.links).toEqual([]);
    expect(insights.selectedNetworkRelationCounts.value).toEqual({
      incoming: 0,
      outgoing: 0,
    });
    expect(insights.selectedNodeAnalysisSummary.value?.notices).toEqual(
      expect.arrayContaining([
        "relationView.nodeAnalysisNotice.lowConnectivity",
        "relationView.nodeAnalysisNotice.missingAvoidance",
      ])
    );
  });

  it("deduplicates repeated relation lines without losing relation metadata", () => {
    const nodes = [
      createNode("ROOT", RelationType.risk),
      createNode("AT01", RelationType.attackTool),
    ];
    const duplicateLine: Line = {
      from: "AT01",
      relationKey: "relationLine.directCauseRisk",
      text: "直接导致风险",
      to: "ROOT",
    };
    const visibleData = createNetworkHelpers(nodes, [
      duplicateLine,
      { ...duplicateLine },
      { ...duplicateLine },
    ]).getVisibleNetworkData();
    const insights = createInsights(nodes, [duplicateLine, { ...duplicateLine }], "ROOT");

    expect(visibleData.links).toHaveLength(1);
    expect(visibleData.links[0]).toEqual(
      expect.objectContaining({
        source: "AT01",
        target: "ROOT",
        sourceFields: ["attack-tool->risk:relationLine.directCauseRisk"],
        evidenceLabel: "evidence:direct",
      })
    );
    expect(insights.selectedNetworkRelationCounts.value).toEqual({
      incoming: 2,
      outgoing: 0,
    });
    expect(insights.selectedNetworkRelations.value.map((relation) => relation.relationKey)).toEqual([
      "AT01::relationLine.directCauseRisk::ROOT",
      "AT01::relationLine.directCauseRisk::ROOT",
    ]);
  });

  it("lays out a high fan-out graph across every layout without dropping visible nodes", () => {
    const { nodes, lines } = createHighFanOutFixture();

    for (const layout of [
      "horizontal",
      "lanes",
      "split",
      "radial",
      "hierarchical",
      "force",
    ] satisfies NetworkLayoutMode[]) {
      const visibleData = createNetworkHelpers(nodes, lines, { layout }).getVisibleNetworkData();
      expect(visibleData.nodes).toHaveLength(nodes.length);
      expect(visibleData.links).toHaveLength(lines.length);
      expect(visibleData.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    }
  });

  it("keeps dense cross-type paths ordered and highlights high connectivity", () => {
    const nodes = [
      createNode("ROOT", RelationType.threatActor),
      createNode("AT01", RelationType.attackTool),
      createNode("AT02", RelationType.attackTool),
      createNode("AT03", RelationType.attackTool),
      createNode("AT04", RelationType.attackTool),
      createNode("AT05", RelationType.attackTool),
      createNode("R01", RelationType.risk),
      createNode("R02", RelationType.risk),
      createNode("A01", RelationType.avoidance),
      createNode("A02", RelationType.avoidance),
      createNode("T01", RelationType.term),
      createNode("T02", RelationType.term),
    ];
    const lines: Line[] = [
      { from: "ROOT", relationKey: "relationLine.useAttackTool", text: "使用攻击工具", to: "AT02" },
      { from: "ROOT", relationKey: "relationLine.useAttackTool", text: "使用攻击工具", to: "AT01" },
      { from: "ROOT", relationKey: "relationLine.useAttackTool", text: "使用攻击工具", to: "AT03" },
      { from: "ROOT", relationKey: "relationLine.useAttackTool", text: "使用攻击工具", to: "AT04" },
      { from: "ROOT", relationKey: "relationLine.useAttackTool", text: "使用攻击工具", to: "AT05" },
      { from: "AT01", relationKey: "relationLine.directCauseRisk", text: "直接导致风险", to: "R01" },
      { from: "AT02", relationKey: "relationLine.directCauseRisk", text: "直接导致风险", to: "R02" },
      { from: "R01", relationKey: "relationLine.avoidanceMeans", text: "规避手段", to: "A01" },
      { from: "R02", relationKey: "relationLine.avoidanceMeans", text: "规避手段", to: "A02" },
      { from: "R01", relationKey: "relationLine.relatedTerm", text: "关联术语", to: "T01" },
      { from: "ROOT", relationKey: "relationLine.indirectSupportRisk", text: "间接支撑风险", to: "R02" },
      { from: "ROOT", relationKey: "relationLine.relatedTerm", text: "关联术语", to: "T01" },
      { from: "ROOT", relationKey: "relationLine.relatedTerm", text: "关联术语", to: "T02" },
    ];

    const rootInsights = createInsights(nodes, lines, "ROOT");
    const avoidanceInsights = createInsights(nodes, lines, "A01");

    expect(rootInsights.selectedNodeAnalysisSummary.value?.notices).toEqual(
      expect.arrayContaining(["relationView.nodeAnalysisNotice.highConnectivity"])
    );
    expect(avoidanceInsights.selectedNodeRootPath.value?.steps.map((step) => step.targetNode.id)).toEqual([
      "AT01",
      "R01",
      "A01",
    ]);
    expect([...avoidanceInsights.selectedNodePathRelationKeys.value]).toEqual([
      "ROOT::relationLine.useAttackTool::AT01",
      "AT01::relationLine.directCauseRisk::R01",
      "R01::relationLine.avoidanceMeans::A01",
    ]);
  });

  it("keeps computed insights reactive when an edge fixture selection changes", () => {
    const selectedNode = ref<Node | null>(createNode("ROOT", RelationType.risk));
    const insights = createRelationGraphInsights({
      t,
      relKey: ref("ROOT"),
      nodes: [
        createNode("ROOT", RelationType.risk),
        createNode("A01", RelationType.avoidance),
      ],
      lines: [{ from: "ROOT", relationKey: "relationLine.avoidanceMeans", text: "规避手段", to: "A01" }],
      selectedNetworkNodeId: computed(() => selectedNode.value?.id ?? ""),
      getNodeTitle: (type, key) => `${type}:${key}`,
      getNodeTypeTitle: (type) => `type:${type}`,
      getRelationPriority: () => 1,
      isDirectRelationLine: () => false,
      getRelationSourceFields: (line) => [`source:${line.text}`],
      explainRelation: (line) => ({
        evidenceLevel: "indirect",
        explanation: `explain:${line.text}`,
        impactHint: `impact:${line.text}`,
        qualityFlags: [],
      }),
      formatEvidenceLevel: (level) => `evidence:${level}`,
    });

    expect(insights.selectedNetworkNode.value?.id).toBe("ROOT");
    selectedNode.value = createNode("A01", RelationType.avoidance);
    expect(insights.selectedNetworkNode.value?.id).toBe("A01");
    expect(insights.selectedNodeRootPath.value?.steps.at(-1)?.targetNode.id).toBe("A01");
  });
});
