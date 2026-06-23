import { describe, expect, it } from "vitest";
import { createRelationAttackPathExplanation } from "../relationAttackPathExplanation";
import { RelationType, type RelationEntityType } from "../relationTypes";

describe("relationAttackPathExplanation", () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key;
  const getNodeTitle = (type: RelationEntityType, key: string) =>
    `${type}:${key}`;

  const createExplanation = () =>
    createRelationAttackPathExplanation({
      buildPathGroupKey: (path) =>
        [
          path.attackToolKey
            ? `${RelationType.attackTool}:${path.attackToolKey}`
            : "no-tool",
          `${RelationType.risk}:${path.riskKey}`,
          path.avoidanceKey
            ? `${RelationType.avoidance}:${path.avoidanceKey}`
            : "no-avoidance",
        ].join("->"),
      getNodeTitle,
      getThreatActorRiskFields: () => ["ThreatActor.indirectSupportRisks"],
      getThreatActorToolFields: (threatActorKey) =>
        threatActorKey === "TA0001"
          ? ["ThreatActor.useAttackTools"]
          : ["ThreatActor.buildAttackTools"],
      getToolRiskFields: () => ["AttackTool.directCauseRisks"],
      t,
    });

  it("按工具、风险和规避手段分组路径，并合并多个行为者证据", () => {
    const { explainGroupedAttackPaths } = createExplanation();

    const [explanation] = explainGroupedAttackPaths([
      {
        threatActorKey: "TA0001",
        attackToolKey: "AT0001",
        riskKey: "R0001",
        avoidanceKey: "A0001",
        avoidanceSourceFields: ["Risk.avoidances", "AttackTool.avoidances"],
      },
      {
        threatActorKey: "TA0002",
        attackToolKey: "AT0001",
        riskKey: "R0001",
        avoidanceKey: "A0001",
        avoidanceSourceFields: ["Risk.avoidances", "AttackTool.avoidances"],
      },
    ]);

    expect(explanation).toEqual(
      expect.objectContaining({
        pathKey: "attack-tool:AT0001->risk:R0001->avoidance:A0001",
        pathCount: 2,
        threatActors: [
          {
            id: "TA0001",
            title: "threat-actor:TA0001",
            type: RelationType.threatActor,
          },
          {
            id: "TA0002",
            title: "threat-actor:TA0002",
            type: RelationType.threatActor,
          },
        ],
        attackToolId: "AT0001",
        riskId: "R0001",
        avoidanceId: "A0001",
        defensiveFocus: ["A0001"],
        qualityFlags: [],
      }),
    );
    expect(explanation.evidenceFields).toEqual([
      "ThreatActor.useAttackTools",
      "ThreatActor.buildAttackTools",
      "AttackTool.directCauseRisks",
      "Risk.avoidances",
      "AttackTool.avoidances",
    ]);
    expect(explanation.steps[0]).toEqual(
      expect.objectContaining({
        fromId: 'relationView.groupedThreatActors:{"count":2}',
        relationType: "relationLine.buildAttackTool",
      }),
    );
  });

  it("没有规避手段时标记质量问题", () => {
    const { explainGroupedAttackPaths } = createExplanation();

    const [explanation] = explainGroupedAttackPaths([
      {
        threatActorKey: "TA0001",
        riskKey: "R0001",
      },
    ]);

    expect(explanation).toEqual(
      expect.objectContaining({
        attackTool: undefined,
        avoidance: undefined,
        qualityFlags: ["relationView.qualityFlagMissingAvoidance"],
      }),
    );
    expect(explanation.steps).toEqual([
      expect.objectContaining({
        relationType: "relationLine.indirectSupportRisk",
        sourceFields: ["ThreatActor.indirectSupportRisks"],
      }),
    ]);
  });
});
