import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createRelationGraphInsights } from "../relationGraphInsights";
import { RelationType, type Line, type Node } from "../relationTypes";

describe("relationGraphInsights", () => {
  const t = (key: string) => key;
  const relationPriority: Record<string, number> = {
    直接导致风险: 1,
    使用攻击工具: 2,
    关联术语: 8,
    规避手段: 9,
  };
  const nodes: Node[] = [
    {
      id: "ROOT",
      type: RelationType.threatActor,
      text: "root actor",
      color: "",
    },
    { id: "TOOL", type: RelationType.attackTool, text: "tool", color: "" },
    { id: "RISK", type: RelationType.risk, text: "risk", color: "" },
    { id: "AVOID", type: RelationType.avoidance, text: "avoidance", color: "" },
    {
      id: "TERM",
      type: RelationType.term,
      text: "term",
      color: "",
      data: { isSubNode: true },
    },
  ];
  const lines: Line[] = [
    { from: "ROOT", text: "使用攻击工具", to: "TOOL" },
    { from: "TOOL", text: "直接导致风险", to: "RISK" },
    { from: "RISK", text: "规避手段", to: "AVOID" },
    { from: "RISK", text: "关联术语", to: "TERM" },
  ];
  const explainRelation = (line: Line) => ({
    evidenceLevel: line.text === "直接导致风险" ? "direct" : "indirect",
    explanation: `explain:${line.text}`,
    impactHint: `impact:${line.text}`,
    qualityFlags: [],
  });
  const formatEvidenceLevel = (level: string) => `evidence:${level}`;

  const createInsights = (selectedNodeId: string) =>
    createRelationGraphInsights({
      t,
      relKey: ref("ROOT"),
      nodes,
      lines,
      selectedNetworkNodeId: ref(selectedNodeId),
      getNodeTitle: (type, key) => `${type}:${key}`,
      getNodeTypeTitle: (type) => `type:${type}`,
      getRelationPriority: (lineText) => relationPriority[lineText] ?? 99,
      isDirectRelationLine: (lineText) => lineText === "直接导致风险",
      getRelationSourceFields: (line) => [`source:${line.text}`],
      explainRelation,
      formatEvidenceLevel,
    });

  it("builds a prioritized root path explanation through a multi-hop graph", () => {
    const insights = createInsights("AVOID");

    expect(insights.selectedNodeRootPath.value).toEqual({
      hopCount: 3,
      startNode: {
        id: "ROOT",
        rawType: RelationType.threatActor,
        isSubNode: false,
        type: "type:threat-actor",
        title: "threat-actor:ROOT",
      },
      steps: [
        expect.objectContaining({
          relation: expect.objectContaining({
            relationKey: "ROOT::使用攻击工具::TOOL",
            direction: "relationView.outgoing",
            directness: "relationView.indirect",
            otherNodeId: "TOOL",
            otherNodeTitle: "attack-tool:TOOL",
            sourceFields: ["source:使用攻击工具"],
            evidenceLevel: "indirect",
            evidenceLabel: "evidence:indirect",
            explanation: "explain:使用攻击工具",
            impactHint: "impact:使用攻击工具",
            qualityFlags: [],
          }),
          targetNode: expect.objectContaining({
            id: "TOOL",
            title: "attack-tool:TOOL",
          }),
          isCurrentTarget: false,
        }),
        expect.objectContaining({
          relation: expect.objectContaining({
            relationKey: "TOOL::直接导致风险::RISK",
            direction: "relationView.outgoing",
            directness: "relationView.direct",
          }),
          targetNode: expect.objectContaining({
            id: "RISK",
            title: "risk:RISK",
          }),
          isCurrentTarget: false,
        }),
        expect.objectContaining({
          relation: expect.objectContaining({
            relationKey: "RISK::规避手段::AVOID",
            direction: "relationView.outgoing",
          }),
          targetNode: expect.objectContaining({
            id: "AVOID",
            title: "avoidance:AVOID",
          }),
          isCurrentTarget: true,
        }),
      ],
    });

    expect([...insights.selectedNodePathRelationKeys.value]).toEqual([
      "ROOT::使用攻击工具::TOOL",
      "TOOL::直接导致风险::RISK",
      "RISK::规避手段::AVOID",
    ]);
  });

  it("summarizes selected-node relation counts, directness, and local preview groups", () => {
    const insights = createInsights("RISK");

    expect(insights.selectedNetworkNodeTitle.value).toBe("risk:RISK");
    expect(insights.selectedNodeAnalysisSummary.value).toEqual(
      expect.objectContaining({
        summary: "relationView.nodeAnalysis.risk",
        highlights: expect.arrayContaining([
          {
            label: "relationView.nodeAnalysisRelatedCount",
            type: "attack-tool",
            ids: ["TOOL"],
          },
          {
            label: "relationView.nodeAnalysisRelatedCount",
            type: "avoidance",
            ids: ["AVOID"],
          },
          {
            label: "relationView.nodeAnalysisRelatedCount",
            type: "term",
            ids: ["TERM"],
          },
        ]),
        notices: ["relationView.nodeAnalysisNotice.rootPath"],
      })
    );
    expect(insights.selectedNetworkRelationCounts.value).toEqual({
      incoming: 1,
      outgoing: 2,
    });
    expect(
      insights.selectedNetworkRelations.value.map((relation) => relation.text)
    ).toEqual(["直接导致风险", "关联术语", "规避手段"]);
    expect(insights.selectedNetworkRelations.value[0]).toEqual(
      expect.objectContaining({
        direction: "relationView.incoming",
        directness: "relationView.direct",
        otherNodeId: "TOOL",
        otherNodeType: "type:attack-tool",
      })
    );

    expect(insights.selectedNodeRootPreview.value).toEqual({
      nodeCount: 4,
      lineCount: 3,
      groupedCounts: {
        [RelationType.risk]: 1,
        [RelationType.attackTool]: 1,
        [RelationType.avoidance]: 1,
        [RelationType.term]: 1,
      },
    });
  });

  it("reports direct root-to-node relations separately from multi-hop path analysis", () => {
    const insights = createRelationGraphInsights({
      t,
      relKey: ref("ROOT"),
      nodes,
      lines: [...lines, { from: "ROOT", text: "直接导致风险", to: "RISK" }],
      selectedNetworkNodeId: ref("RISK"),
      getNodeTitle: (type, key) => `${type}:${key}`,
      getNodeTypeTitle: (type) => `type:${type}`,
      getRelationPriority: (lineText) => relationPriority[lineText] ?? 99,
      isDirectRelationLine: (lineText) => lineText === "直接导致风险",
      getRelationSourceFields: (line) => [`source:${line.text}`],
      explainRelation,
      formatEvidenceLevel,
    });

    expect(insights.rootNodeRelations.value).toEqual([
      {
        text: "直接导致风险",
        direction: "relationView.rootToNode",
        directness: "relationView.direct",
        evidenceLevel: "direct",
        evidenceLabel: "evidence:direct",
        explanation: "explain:直接导致风险",
        impactHint: "impact:直接导致风险",
        qualityFlags: [],
        sourceFields: ["source:直接导致风险"],
        priority: 1,
      },
    ]);
  });

  it("falls back to the root node when the selected node is unavailable", () => {
    const insights = createInsights("MISSING");

    expect(insights.selectedNetworkNode.value?.id).toBe("ROOT");
    expect(insights.selectedNetworkNodeTitle.value).toBe("threat-actor:ROOT");
    expect(insights.isCurrentNodeRoot.value).toBe(true);
    expect(insights.rootNodeRelations.value).toEqual([]);
    expect(insights.selectedNodeRootPath.value).toBeNull();
  });

  it("does not report root-node relations for nodes that are only connected through a path", () => {
    const insights = createInsights("AVOID");

    expect(insights.rootNodeRelations.value).toEqual([]);
    expect(insights.selectedNodeRootPath.value?.steps.map((step) => step.relation.relationKey)).toEqual([
      "ROOT::使用攻击工具::TOOL",
      "TOOL::直接导致风险::RISK",
      "RISK::规避手段::AVOID",
    ]);
  });
});
