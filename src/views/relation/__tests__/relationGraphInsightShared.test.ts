import { describe, expect, it } from "vitest";
import { createRelationGraphInsightHelpers } from "../relationGraphInsightShared";
import { RelationType, type Line, type Node } from "../relationTypes";

describe("relationGraphInsightShared", () => {
  const nodes: Node[] = [
    {
      id: "ROOT",
      type: RelationType.risk,
      text: "root",
      color: "",
      data: { isSubNode: true },
    },
    {
      id: "A0001",
      type: RelationType.avoidance,
      text: "avoidance",
      color: "",
    },
  ];

  const createHelpers = () =>
    createRelationGraphInsightHelpers({
      t: (key) => `t:${key}`,
      nodes,
      lines: [],
      getNodeTitle: (type, key) => `${type}:${key}`,
      getNodeTypeTitle: (type) => `type:${type}`,
      getRelationPriority: (lineKey) => (lineKey === "direct" ? 1 : 9),
      isDirectRelationLine: (lineKey) => lineKey === "direct",
      getRelationSourceFields: (line) => [
        `source:${line.relationKey ?? line.text}`,
      ],
      explainRelation: (line) => ({
        evidenceLevel: line.relationKey === "direct" ? "direct" : "review",
        explanation: `explain:${line.text}`,
        impactHint: `impact:${line.text}`,
        qualityFlags: line.from === "MISSING" ? ["missing-target"] : [],
      }),
      formatEvidenceLevel: (level) => `evidence:${level}`,
    });

  it("构建节点摘要时保留子节点标记并处理缺失节点", () => {
    const helpers = createHelpers();

    expect(helpers.buildNodeSummary("ROOT")).toEqual({
      id: "ROOT",
      rawType: RelationType.risk,
      isSubNode: true,
      type: "type:risk",
      title: "risk:ROOT",
    });
    expect(helpers.buildNodeSummary("MISSING")).toEqual({
      id: "MISSING",
      rawType: "",
      isSubNode: false,
      type: "",
      title: "",
    });
  });

  it("构建关系摘要时区分出入方向、直接性和缺失对端节点", () => {
    const helpers = createHelpers();
    const outgoing: Line = {
      from: "ROOT",
      to: "A0001",
      text: "直接导致",
      relationKey: "direct",
    };
    const incomingMissing: Line = {
      from: "MISSING",
      to: "ROOT",
      text: "未知来源",
      relationKey: "review",
    };

    expect(helpers.buildRelationSummary(outgoing, "ROOT")).toEqual(
      expect.objectContaining({
        relationKey: "ROOT::direct::A0001",
        direction: "t:relationView.outgoing",
        directness: "t:relationView.direct",
        directnessKey: "direct",
        evidenceLevel: "direct",
        evidenceLabel: "evidence:direct",
        otherNodeId: "A0001",
        otherNodeType: "type:avoidance",
        otherNodeTitle: "avoidance:A0001",
        priority: 1,
        sourceFields: ["source:direct"],
      }),
    );

    expect(helpers.buildRelationSummary(incomingMissing, "ROOT")).toEqual(
      expect.objectContaining({
        relationKey: "MISSING::review::ROOT",
        direction: "t:relationView.incoming",
        directness: "t:relationView.indirect",
        directnessKey: "indirect",
        otherNodeId: "MISSING",
        otherNodeType: "",
        otherNodeTitle: "",
        qualityFlags: ["missing-target"],
        priority: 9,
      }),
    );
  });
});
