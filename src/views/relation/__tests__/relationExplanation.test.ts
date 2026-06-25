import { describe, expect, it } from "vitest";
import { createRelationExplanationHelpers } from "../relationExplanation";
import {
  directRelationLineKeys,
  relationExplanationRuleByKey,
  relationExplanationRules,
} from "../relationExplanationRules";
import { RelationType, type Line, type Node } from "../relationTypes";

describe("relationExplanation", () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    params
      ? `${key}:${Object.values(params)
          .map((value) => String(value))
          .join("|")}`
      : key;
  const nodes: Node[] = [
    {
      id: "AT0001",
      type: RelationType.attackTool,
      text: "AT0001<br/>电话黑卡",
      color: "",
    },
    {
      id: "R0001",
      type: RelationType.risk,
      text: "R0001<br/>流程自动化",
      color: "",
    },
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
        semanticExplanation:
          "relationView.semanticExplanation.directCauseRisk:AT0001|电话黑卡|R0001|流程自动化|relationLine.directCauseRisk",
        impactHint: "relationView.relationImpact.directCauseRisk",
        sourceFields: ["AttackTool.directCauseRisks"],
        qualityFlags: [],
      }),
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
      }),
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
      }),
    );
  });

  it("maps avoidance relation source fields by endpoint types", () => {
    expect(
      helpers.getRelationSourceFields({
        from: "AT0001",
        text: "relationLine.avoidanceMeans",
        to: "A0001",
      }),
    ).toEqual(["AttackTool.avoidances"]);

    expect(
      helpers.getRelationSourceFields(
        {
          from: "R0001",
          text: "relationLine.avoidanceMeans",
          to: "AT0001",
        },
        RelationType.avoidance,
        RelationType.attackTool,
      ),
    ).toEqual(["AttackTool.avoidances"]);

    expect(
      helpers.explainRelation(
        {
          from: "A0001",
          text: "relationLine.avoidanceMeans",
          to: "R0001",
        },
        RelationType.avoidance,
        RelationType.risk,
      ),
    ).toEqual(
      expect.objectContaining({
        explanation: "relationView.relationExplanation.avoidance",
        semanticExplanation:
          "relationView.semanticExplanation.avoidance:A0001|avoidance|R0001|流程自动化|relationLine.avoidanceMeans",
      }),
    );
  });

  it("maps risk causation source fields for attack tools and threat actors", () => {
    expect(
      helpers.getRelationSourceFields({
        from: "AT0001",
        text: "relationLine.indirectSupportRisk",
        to: "R0001",
      }),
    ).toEqual(["AttackTool.indirectSupportRisks"]);

    expect(
      helpers.getRelationSourceFields({
        from: "TA0001",
        text: "relationLine.directCauseRisk",
        to: "R0001",
      }),
    ).toEqual(["ThreatActor.directCauseRisks"]);

    expect(
      helpers.getRelationSourceFields({
        from: "TA0001",
        text: "relationLine.indirectSupportRisk",
        to: "R0001",
      }),
    ).toEqual(["ThreatActor.indirectSupportRisks"]);

    expect(
      helpers.getRelationSourceFields({
        from: "AT0001",
        text: "relationLine.causeRisk",
        to: "R0001",
      }),
    ).toEqual([
      "AttackTool.directCauseRisks",
      "AttackTool.indirectSupportRisks",
    ]);

    expect(
      helpers.getRelationSourceFields({
        from: "TA0001",
        text: "relationLine.causeRisk",
        to: "R0001",
      }),
    ).toEqual([
      "ThreatActor.directCauseRisks",
      "ThreatActor.indirectSupportRisks",
    ]);
  });

  it("maps term relation source fields for every supported target type", () => {
    const termLine = (to: string, targetType: RelationType) =>
      helpers.getRelationSourceFields(
        {
          from: "T0001",
          text: "relationLine.relatedTerm",
          to,
        },
        RelationType.term,
        targetType,
      );

    expect(termLine("R0001", RelationType.risk)).toEqual(["Term.relatedRisks"]);
    expect(termLine("A0001", RelationType.avoidance)).toEqual([
      "Term.relatedAvoidances",
    ]);
    expect(termLine("AT0001", RelationType.attackTool)).toEqual([
      "Term.relatedAttackTools",
    ]);
    expect(termLine("TA0001", RelationType.threatActor)).toEqual([
      "Term.relatedThreatActors",
    ]);
  });

  it("falls back for missing node titles and translated relation labels", () => {
    const translatedHelpers = createRelationExplanationHelpers({
      t: (key: string) =>
        key === "relationLine.directCauseRisk" ? "直接导致风险" : key,
      nodes: [
        {
          id: "R9999",
          type: RelationType.risk,
          text: "   ",
          color: "",
        },
      ],
    });

    expect(translatedHelpers.getRelationPriority("直接导致风险")).toBe(0);
    expect(translatedHelpers.isDirectRelationLine("直接导致风险")).toBe(true);
    expect(translatedHelpers.getRelationPriority("不存在的关系")).toBe(6);
    expect(translatedHelpers.explainRelation({
      from: "UNKNOWN",
      text: "relationLine.directCauseRisk",
      to: "R9999",
    }).semanticExplanation).toBe(
      "relationView.semanticExplanation.directCauseRisk",
    );
    expect(translatedHelpers.formatEvidenceLevel("manual-review")).toBe(
      "relationView.evidenceLevel.manual-review",
    );
  });

  it("keeps explanation coverage for every configured relation line", () => {
    const coverage = helpers.relationExplanationCoverage;

    expect(coverage.map((item) => item.relationKey)).toEqual([
      "relationLine.avoidanceMeans",
      "relationLine.directCauseRisk",
      "relationLine.indirectSupportRisk",
      "relationLine.riskPrerequisite",
      "relationLine.riskCoOccurrence",
      "relationLine.riskEscalation",
      "relationLine.riskVariant",
      "relationLine.avoidancePrerequisite",
      "relationLine.avoidanceComplement",
      "relationLine.avoidanceAlternative",
      "relationLine.avoidanceMitigatesGap",
      "relationLine.attackToolPrerequisite",
      "relationLine.attackToolCoUsed",
      "relationLine.attackToolAlternative",
      "relationLine.attackToolCapabilityUpgrade",
      "relationLine.threatActorCoInvolved",
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
        /^relationView\.relationExplanation\./,
      );
      expect(item.impactKey).toMatch(/^relationView\.relationImpact\./);
      expect(item.sourceFields.length).toBeGreaterThan(0);
      expect(["direct", "indirect", "inferred", "review"]).toContain(
        item.evidenceLevel,
      );
    });
  });

  it("derives coverage and direct relation checks from rule configuration", () => {
    const coverage = helpers.relationExplanationCoverage;

    expect(coverage.map((item) => item.relationKey)).toEqual(
      relationExplanationRules.map((rule) => rule.relationKey),
    );
    expect(
      coverage.every(
        (item) =>
          relationExplanationRuleByKey.get(item.relationKey)?.evidenceLevel ===
          item.evidenceLevel,
      ),
    ).toBe(true);

    relationExplanationRules.forEach((rule) => {
      const line: Line = {
        from: "AT0001",
        text: rule.relationKey,
        to: "R0001",
      };

      expect(helpers.getRelationEvidenceLevel(line)).toBe(rule.evidenceLevel);
      expect(helpers.isDirectRelationLine(rule.relationKey)).toBe(
        directRelationLineKeys.has(rule.relationKey),
      );
      expect(helpers.getRelationPriority(rule.relationKey)).toBe(rule.priority);
    });
  });
});
