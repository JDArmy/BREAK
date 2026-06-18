import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createNetworkDataHelpers } from "../relationNetworkLayout";
import {
  RelationType,
  type Line,
  type NetworkLayoutMode,
  type Node,
} from "../relationTypes";

describe("relationNetworkLayout", () => {
  const nodes: Node[] = [
    { id: "ROOT", type: RelationType.risk, text: "Root<br/>Risk", color: "" },
    {
      id: "TOOL",
      type: RelationType.attackTool,
      text: "AttackTool",
      color: "",
    },
    {
      id: "ACTOR",
      type: RelationType.threatActor,
      text: "ThreatActor",
      color: "",
    },
    { id: "AVOID", type: RelationType.avoidance, text: "Avoidance", color: "" },
    {
      id: "TERM",
      type: RelationType.term,
      text: "Term",
      color: "",
      data: { isSubNode: true },
    },
  ];
  const lines: Line[] = [
    { from: "ROOT", relationKey: "relationLine.avoidanceMeans", text: "规避手段", to: "AVOID" },
    { from: "ROOT", relationKey: "relationLine.directCauseRisk", text: "攻击工具", to: "TOOL" },
    { from: "ROOT", relationKey: "relationLine.directCauseRisk", text: "攻击工具", to: "TOOL" },
    { from: "ACTOR", relationKey: "relationLine.useAttackTool", text: "使用攻击工具", to: "TOOL" },
    { from: "ROOT", relationKey: "relationLine.relatedTerm", text: "关联术语", to: "TERM" },
  ];

  const createHelpers = (options?: {
    layout?: NetworkLayoutMode;
    filterRelationType?: string[];
    filterSubNode?: boolean;
    filterLineType?: string[];
    selectedNetworkNodeId?: string;
    draggedNodePositions?: Record<string, { x: number; y: number }>;
    isDark?: boolean;
  }) =>
    createNetworkDataHelpers({
      nodes,
      lines,
      relKey: ref("ROOT"),
      selectedNetworkNodeId: ref(options?.selectedNetworkNodeId ?? ""),
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
          "relationLine.useAttackTool",
          "relationLine.relatedTerm",
        ]
      ),
      draggedNodePositions: ref(options?.draggedNodePositions ?? {}),
      networkState: { layout: options?.layout ?? "horizontal" },
      relationLegendItems: ref([
        { key: "relationLine.avoidanceMeans", color: "#a", label: "规避手段" },
        { key: "relationLine.directCauseRisk", color: "#b", label: "攻击工具" },
        { key: "relationLine.useAttackTool", color: "#c", label: "使用攻击工具" },
        { key: "relationLine.relatedTerm", color: "#d", label: "关联术语" },
      ]),
      isDark: ref(options?.isDark ?? false),
      getRelationTypeColor: (type) => `color:${type}`,
      wrapLabelText: (text, maxLineLength) => `${text}|${maxLineLength}`,
      getGraphColor: (key) => `graph:${key}`,
      getRelationSourceFields: (line, fromType, toType) => [
        `${fromType}->${toType}:${line.text}`,
      ],
      explainRelation: (line, fromType, toType) => ({
        relationKey: `${line.from}::${line.relationKey ?? line.text}::${line.to}`,
        fromId: line.from,
        toId: line.to,
        relationType: line.text,
        sourceFields: [`${fromType}->${toType}:${line.text}`],
        evidenceLevel: "direct",
        explanation: `explain:${line.text}`,
        impactHint: `impact:${line.text}`,
        qualityFlags: [],
      }),
      formatEvidenceLevel: (level) => `evidence:${level}`,
      getNodeTypeTitle: (type) => `type:${type}`,
    });

  it("deduplicates links, normalizes node labels, and applies selection styling in complex visible data", () => {
    const helpers = createHelpers({
      selectedNetworkNodeId: "TOOL",
      layout: "split",
    });
    const visibleData = helpers.getVisibleNetworkData();

    expect(visibleData.nodes).toHaveLength(5);
    expect(visibleData.links).toHaveLength(4);
    expect(visibleData.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "ROOT",
          target: "TOOL",
          text: "攻击工具",
          sourceDisplay: "type:risk: Root Risk",
          targetDisplay: "type:attack-tool: AttackTool",
          sourceFields: ["risk->attack-tool:攻击工具"],
          evidenceLabel: "evidence:direct",
          explanation: expect.objectContaining({
            explanation: "explain:攻击工具",
            impactHint: "impact:攻击工具",
          }),
          lineStyle: expect.objectContaining({ color: "#b", opacity: 0.52 }),
        }),
      ])
    );

    const rootNode = visibleData.nodes.find((node) => node.id === "ROOT");
    expect(rootNode).toEqual(
      expect.objectContaining({ text: "Root\nRisk", fixed: true, x: 0, y: 0 })
    );

    const selectedTool = visibleData.nodes.find((node) => node.id === "TOOL");
    expect(selectedTool).toEqual(
      expect.objectContaining({
        symbolSize: 68,
        itemStyle: expect.objectContaining({
          borderColor: "graph:selectedNodeBorder",
          borderWidth: 3,
          shadowBlur: 18,
        }),
        label: expect.objectContaining({ fontWeight: 700 }),
      })
    );
  });

  it("filters relation types, sub nodes, and line types consistently", () => {
    const helpers = createHelpers({
      filterRelationType: [
        RelationType.risk,
        RelationType.attackTool,
        RelationType.avoidance,
      ],
      filterSubNode: false,
      filterLineType: ["relationLine.directCauseRisk"],
    });
    const visibleData = helpers.getVisibleNetworkData();

    expect(visibleData.nodes.map((node) => node.id).sort()).toEqual([
      "AVOID",
      "ROOT",
      "TOOL",
    ]);
    expect(visibleData.links).toEqual([
      expect.objectContaining({
        source: "ROOT",
        target: "TOOL",
        text: "攻击工具",
      }),
    ]);
  });

  it("uses dragged positions only in force layout and keeps sub-node styling distinct", () => {
    const helpers = createHelpers({
      layout: "force",
      selectedNetworkNodeId: "TERM",
      draggedNodePositions: { TERM: { x: 123, y: 456 } },
      isDark: true,
    });
    const visibleData = helpers.getVisibleNetworkData();
    const termNode = visibleData.nodes.find((node) => node.id === "TERM");

    expect(termNode).toEqual(
      expect.objectContaining({
        fixed: true,
        x: 123,
        y: 456,
        itemStyle: expect.objectContaining({
          color: "graph:subNodeFill",
          borderColor: "graph:selectedNodeBorder",
        }),
      })
    );
    expect(
      visibleData.links.find((link) => link.text === "关联术语")?.lineStyle
        .opacity
    ).toBe(0.42);
  });

  it("converts rendered graph nodes back to context-menu nodes", () => {
    const helpers = createHelpers({ selectedNetworkNodeId: "ROOT" });
    const graphNode = helpers
      .getVisibleNetworkData()
      .nodes.find((node) => node.id === "ROOT");

    expect(graphNode).toBeDefined();
    expect(helpers.toContextNode(graphNode!)).toEqual({
      id: "ROOT",
      type: RelationType.risk,
      text: "Root\nRisk",
      color: "color:risk",
      data: undefined,
    });
  });

  it("places nodes in lane, radial, and hierarchical layouts without dropping visible relations", () => {
    const laneData = createHelpers({ layout: "lanes" }).getVisibleNetworkData();
    const radialData = createHelpers({ layout: "radial" }).getVisibleNetworkData();
    const hierarchicalData = createHelpers({
      layout: "hierarchical",
    }).getVisibleNetworkData();

    expect(laneData.nodes.find((node) => node.id === "ACTOR")).toEqual(
      expect.objectContaining({ y: -440 })
    );
    expect(radialData.nodes.find((node) => node.id === "ACTOR")?.x).toBeLessThan(0);
    expect(hierarchicalData.nodes.find((node) => node.id === "AVOID")).toEqual(
      expect.objectContaining({ x: 660 })
    );
    expect(laneData.links).toHaveLength(4);
    expect(radialData.links).toHaveLength(4);
    expect(hierarchicalData.links).toHaveLength(4);
  });
});
