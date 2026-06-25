import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { createRelationGraphRelationSummary } from "../relationGraphRelationSummary";
import { RelationType, type Line, type Node } from "../relationTypes";

const nodes: Node[] = [
  { id: "ROOT", type: RelationType.risk, text: "root", color: "" },
  { id: "A0001", type: RelationType.avoidance, text: "avoidance", color: "" },
  { id: "AT0001", type: RelationType.attackTool, text: "tool", color: "" },
  { id: "TERM", type: RelationType.term, text: "term", color: "" },
];

const lines: Line[] = [
  { from: "ROOT", to: "A0001", text: "规避", relationKey: "risk-avoidance" },
  { from: "AT0001", to: "ROOT", text: "直接导致", relationKey: "direct" },
  { from: "TERM", to: "ROOT", text: "术语关联", relationKey: "term" },
  { from: "A0001", to: "ROOT", text: "反向", relationKey: "reverse" },
];

const createSummary = (selectedId: string, relKey = "ROOT") =>
  createRelationGraphRelationSummary({
    t: (key) => `t:${key}`,
    relKey: ref(relKey),
    selectedNetworkNodeId: ref(selectedId),
    nodes,
    lines,
    getNodeTitle: (type, key) => `${type}:${key}`,
    getNodeTypeTitle: (type) => `type:${type}`,
    getRelationPriority: (lineText) =>
      ({ direct: 1, "risk-avoidance": 2, reverse: 3, term: 4 }[lineText] ?? 9),
    isDirectRelationLine: (lineText) => lineText === "direct",
    getRelationSourceFields: (line) => [`source:${line.relationKey ?? line.text}`],
    explainRelation: (line) => ({
      evidenceLevel: line.relationKey === "direct" ? "direct" : "indirect",
      explanation: `explain:${line.text}`,
      impactHint: `impact:${line.text}`,
      qualityFlags: line.relationKey === "reverse" ? ["review"] : [],
    }),
    formatEvidenceLevel: (level) => `evidence:${level}`,
  });

describe("relationGraphRelationSummary", () => {
  it("选中节点不存在时回退到根节点", () => {
    const summary = createSummary("MISSING");

    expect(summary.selectedNetworkNode.value?.id).toBe("ROOT");
    expect(summary.selectedNetworkNodeTitle.value).toBe("risk:ROOT");
    expect(summary.isCurrentNodeRoot.value).toBe(true);
    expect(summary.rootNodeRelations.value).toEqual([]);
    expect(summary.selectedNetworkRelationCounts.value).toEqual({
      incoming: 3,
      outgoing: 1,
    });
  });

  it("按优先级和节点 ID 排序选中节点关系列表", () => {
    const summary = createSummary("ROOT");

    expect(
      summary.selectedNetworkRelations.value.map((relation) => [
        relation.relationLineKey,
        relation.otherNodeId,
      ]),
    ).toEqual([
      ["direct", "AT0001"],
      ["risk-avoidance", "A0001"],
      ["reverse", "A0001"],
      ["term", "TERM"],
    ]);
  });

  it("生成 root 到节点和节点到 root 的直接关系摘要", () => {
    const outgoing = createSummary("A0001");
    expect(outgoing.rootNodeRelations.value).toEqual([
      expect.objectContaining({
        text: "规避",
        direction: "t:relationView.rootToNode",
        directness: "t:relationView.indirect",
        evidenceLabel: "evidence:indirect",
        sourceFields: ["source:risk-avoidance"],
      }),
      expect.objectContaining({
        text: "反向",
        direction: "t:relationView.nodeToRoot",
        qualityFlags: ["review"],
        priority: 3,
      }),
    ]);

    const incoming = createSummary("AT0001");
    expect(incoming.rootNodeRelations.value).toEqual([
      expect.objectContaining({
        text: "直接导致",
        direction: "t:relationView.nodeToRoot",
        directness: "t:relationView.direct",
        evidenceLevel: "direct",
      }),
    ]);
  });

  it("没有任何节点时返回空状态", () => {
    const summary = createRelationGraphRelationSummary({
      t: (key) => key,
      relKey: ref("ROOT"),
      selectedNetworkNodeId: ref("ROOT"),
      nodes: [],
      lines: [],
      getNodeTitle: (type, key) => `${type}:${key}`,
      getNodeTypeTitle: (type) => type,
      getRelationPriority: () => 1,
      isDirectRelationLine: () => false,
      getRelationSourceFields: () => [],
      explainRelation: () => ({
        evidenceLevel: "review",
        explanation: "",
        impactHint: "",
        qualityFlags: [],
      }),
      formatEvidenceLevel: (level) => level,
    });

    expect(summary.selectedNetworkNode.value).toBeNull();
    expect(summary.selectedNetworkNodeTitle.value).toBe("");
    expect(summary.selectedNetworkRelations.value).toEqual([]);
    expect(summary.selectedNetworkRelationCounts.value).toEqual({
      incoming: 0,
      outgoing: 0,
    });
    expect(summary.isCurrentNodeRoot.value).toBe(false);
  });
});
