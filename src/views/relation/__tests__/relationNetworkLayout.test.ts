import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createNetworkDataHelpers } from "../relationNetworkLayout";
import { RelationType, type Line, type NetworkLayoutMode, type Node } from "../relationTypes";

describe("relationNetworkLayout", () => {
  const nodes: Node[] = [
    { id: "ROOT", type: RelationType.risk, text: "Root<br/>Risk", color: "" },
    { id: "TOOL", type: RelationType.attackTool, text: "AttackTool", color: "" },
    { id: "ACTOR", type: RelationType.threatActor, text: "ThreatActor", color: "" },
    { id: "AVOID", type: RelationType.avoidance, text: "Avoidance", color: "" },
    { id: "TERM", type: RelationType.term, text: "Term", color: "", data: { isSubNode: true } },
  ];
  const lines: Line[] = [
    { from: "ROOT", text: "规避手段", to: "AVOID" },
    { from: "ROOT", text: "攻击工具", to: "TOOL" },
    { from: "ROOT", text: "攻击工具", to: "TOOL" },
    { from: "ACTOR", text: "使用攻击工具", to: "TOOL" },
    { from: "ROOT", text: "关联术语", to: "TERM" },
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
      filterRelationType: ref(options?.filterRelationType ?? [
        RelationType.risk,
        RelationType.avoidance,
        RelationType.attackTool,
        RelationType.threatActor,
        RelationType.term,
      ]),
      filterSubNode: ref(options?.filterSubNode ?? true),
      filterLineType: ref(options?.filterLineType ?? ["规避手段", "攻击工具", "使用攻击工具", "关联术语"]),
      draggedNodePositions: ref(options?.draggedNodePositions ?? {}),
      networkState: { layout: options?.layout ?? "horizontal" },
      relationLegendItems: ref([
        { color: "#a", label: "规避手段" },
        { color: "#b", label: "攻击工具" },
        { color: "#c", label: "使用攻击工具" },
        { color: "#d", label: "关联术语" },
      ]),
      isDark: ref(options?.isDark ?? false),
      getRelationTypeColor: (type) => `color:${type}`,
      wrapLabelText: (text, maxLineLength) => `${text}|${maxLineLength}`,
      getGraphColor: (key) => `graph:${key}`,
      getRelationSourceFields: (line, fromType, toType) => [`${fromType}->${toType}:${line.text}`],
    });

  it("deduplicates links, normalizes node labels, and applies selection styling in complex visible data", () => {
    const helpers = createHelpers({ selectedNetworkNodeId: "TOOL", layout: "split" });
    const visibleData = helpers.getVisibleNetworkData();

    expect(visibleData.nodes).toHaveLength(5);
    expect(visibleData.links).toHaveLength(4);
    expect(visibleData.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "ROOT",
          target: "TOOL",
          text: "攻击工具",
          sourceFields: ["risk->attack-tool:攻击工具"],
          lineStyle: expect.objectContaining({ color: "#b", opacity: 0.52 }),
        }),
      ])
    );

    const rootNode = visibleData.nodes.find((node) => node.id === "ROOT");
    expect(rootNode).toEqual(expect.objectContaining({ text: "Root\nRisk", fixed: true, x: 0, y: 0 }));

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
      filterRelationType: [RelationType.risk, RelationType.attackTool, RelationType.avoidance],
      filterSubNode: false,
      filterLineType: ["攻击工具"],
    });
    const visibleData = helpers.getVisibleNetworkData();

    expect(visibleData.nodes.map((node) => node.id).sort()).toEqual(["AVOID", "ROOT", "TOOL"]);
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
    expect(visibleData.links.find((link) => link.text === "关联术语")?.lineStyle.opacity).toBe(0.42);
  });

  it("converts rendered graph nodes back to context-menu nodes", () => {
    const helpers = createHelpers({ selectedNetworkNodeId: "ROOT" });
    const graphNode = helpers.getVisibleNetworkData().nodes.find((node) => node.id === "ROOT");

    expect(graphNode).toBeDefined();
    expect(helpers.toContextNode(graphNode!)).toEqual({
      id: "ROOT",
      type: RelationType.risk,
      text: "Root\nRisk",
      color: "color:risk",
      data: undefined,
    });
  });
});
