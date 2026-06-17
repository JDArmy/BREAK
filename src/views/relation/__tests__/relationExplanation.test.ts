import { describe, expect, it } from "vitest";
import { createRelationExplanationHelpers } from "../relationExplanation";
import { RelationType, type Line, type Node } from "../relationTypes";

describe("relationExplanation", () => {
  const t = (key: string) => key;
  const nodes: Node[] = [
    { id: "AT0001", type: RelationType.attackTool, text: "tool", color: "" },
    { id: "R0001", type: RelationType.risk, text: "risk", color: "" },
    { id: "A0001", type: RelationType.avoidance, text: "avoidance", color: "" },
    { id: "TA0001", type: RelationType.threatActor, text: "actor", color: "" },
  ];
  const helpers = createRelationExplanationHelpers({ t, nodes });

  it("explains direct attack-tool to risk relations with source fields", () => {
    const line: Line = {
      from: "AT0001",
      text: "relationLine.directCauseRisk",
      to: "R0001",
    };

    expect(helpers.explainRelation(line)).toEqual(
      expect.objectContaining({
        evidenceLevel: "direct",
        explanation: "relationView.relationExplanation.directCauseRisk",
        impactHint: "relationView.relationImpact.directCauseRisk",
        sourceFields: ["AttackTool.directCauseRisks"],
        qualityFlags: [],
      })
    );
  });

  it("marks unknown relation templates for review", () => {
    const line: Line = {
      from: "TA0001",
      text: "unknown",
      to: "R0001",
    };

    expect(helpers.explainRelation(line)).toEqual(
      expect.objectContaining({
        evidenceLevel: "review",
        sourceFields: [],
        qualityFlags: [
          "relationView.qualityFlagMissingSource",
          "relationView.qualityFlagReview",
        ],
      })
    );
  });

  it("explains risk avoidance as direct defensive coverage", () => {
    const line: Line = {
      from: "R0001",
      text: "relationLine.avoidanceMeans",
      to: "A0001",
    };

    expect(helpers.explainRelation(line)).toEqual(
      expect.objectContaining({
        evidenceLevel: "direct",
        sourceFields: ["Risk.avoidances"],
        explanation: "relationView.relationExplanation.riskAvoidance",
      })
    );
  });

  it("keeps explanation coverage for every configured relation line", () => {
    const coverage = helpers.relationExplanationCoverage;

    expect(coverage.map((item) => item.relationKey)).toEqual([
      "relationLine.avoidanceMeans",
      "relationLine.directCauseRisk",
      "relationLine.indirectSupportRisk",
      "relationLine.buildAttackTool",
      "relationLine.useAttackTool",
      "relationLine.causeRisk",
      "relationLine.relatedTerm",
      "relationLine.subRisk",
      "relationLine.subAvoidance",
      "relationLine.subAttackTool",
      "relationLine.subThreatActor",
      "relationLine.attackToolMaker",
    ]);

    coverage.forEach((item) => {
      expect(item.explanationKey).toMatch(
        /^relationView\.relationExplanation\./
      );
      expect(item.impactKey).toMatch(/^relationView\.relationImpact\./);
      expect(item.sourceFields.length).toBeGreaterThan(0);
      expect(["direct", "indirect", "inferred", "review"]).toContain(
        item.evidenceLevel
      );
    });
  });
});
