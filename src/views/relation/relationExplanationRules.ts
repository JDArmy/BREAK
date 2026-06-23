import type { RelationEvidenceLevel } from "@/views/relation/relationTypes";

export type RelationLineKey =
  | "avoidanceMeans"
  | "directCauseRisk"
  | "indirectSupportRisk"
  | "riskPrerequisite"
  | "riskCoOccurrence"
  | "riskEscalation"
  | "riskVariant"
  | "avoidancePrerequisite"
  | "avoidanceComplement"
  | "avoidanceAlternative"
  | "avoidanceMitigatesGap"
  | "attackToolPrerequisite"
  | "attackToolCoUsed"
  | "attackToolAlternative"
  | "attackToolCapabilityUpgrade"
  | "threatActorCoInvolved"
  | "buildAttackTool"
  | "useAttackTool"
  | "causeRisk"
  | "relatedTerm"
  | "subRisk"
  | "subAvoidance"
  | "subAttackTool"
  | "subThreatActor"
  | "attackToolMaker";

export interface RelationExplanationRule {
  key: RelationLineKey;
  relationKey: `relationLine.${RelationLineKey}`;
  explanationKey: string;
  semanticKey: string;
  impactKey: string;
  evidenceLevel: RelationEvidenceLevel;
  sourceFields: string[];
  priority: number;
}

export interface RelationExplanationCoverageItem {
  key: RelationLineKey;
  relationKey: `relationLine.${RelationLineKey}`;
  explanationKey: string;
  impactKey: string;
  evidenceLevel: RelationEvidenceLevel;
  sourceFields: string[];
}

export const relationExplanationRules: RelationExplanationRule[] = [
  {
    key: "avoidanceMeans",
    relationKey: "relationLine.avoidanceMeans",
    explanationKey: "relationView.relationExplanation.avoidance",
    semanticKey: "relationView.semanticExplanation.avoidance",
    impactKey: "relationView.relationImpact.avoidance",
    evidenceLevel: "direct",
    sourceFields: ["Risk.avoidances", "AttackTool.avoidances"],
    priority: 4,
  },
  {
    key: "directCauseRisk",
    relationKey: "relationLine.directCauseRisk",
    explanationKey: "relationView.relationExplanation.directCauseRisk",
    semanticKey: "relationView.semanticExplanation.directCauseRisk",
    impactKey: "relationView.relationImpact.directCauseRisk",
    evidenceLevel: "direct",
    sourceFields: [
      "AttackTool.directCauseRisks",
      "ThreatActor.directCauseRisks",
    ],
    priority: 0,
  },
  {
    key: "indirectSupportRisk",
    relationKey: "relationLine.indirectSupportRisk",
    explanationKey: "relationView.relationExplanation.indirectSupportRisk",
    semanticKey: "relationView.semanticExplanation.indirectSupportRisk",
    impactKey: "relationView.relationImpact.indirectSupportRisk",
    evidenceLevel: "indirect",
    sourceFields: [
      "AttackTool.indirectSupportRisks",
      "ThreatActor.indirectSupportRisks",
    ],
    priority: 5,
  },
  {
    key: "riskPrerequisite",
    relationKey: "relationLine.riskPrerequisite",
    explanationKey: "relationView.relationExplanation.riskPrerequisite",
    semanticKey: "relationView.semanticExplanation.riskPrerequisite",
    impactKey: "relationView.relationImpact.riskRelation",
    evidenceLevel: "direct",
    sourceFields: ["Risk.relatedRisks"],
    priority: 3,
  },
  {
    key: "riskCoOccurrence",
    relationKey: "relationLine.riskCoOccurrence",
    explanationKey: "relationView.relationExplanation.riskCoOccurrence",
    semanticKey: "relationView.semanticExplanation.riskCoOccurrence",
    impactKey: "relationView.relationImpact.riskRelation",
    evidenceLevel: "direct",
    sourceFields: ["Risk.relatedRisks"],
    priority: 3,
  },
  {
    key: "riskEscalation",
    relationKey: "relationLine.riskEscalation",
    explanationKey: "relationView.relationExplanation.riskEscalation",
    semanticKey: "relationView.semanticExplanation.riskEscalation",
    impactKey: "relationView.relationImpact.riskRelation",
    evidenceLevel: "direct",
    sourceFields: ["Risk.relatedRisks"],
    priority: 3,
  },
  {
    key: "riskVariant",
    relationKey: "relationLine.riskVariant",
    explanationKey: "relationView.relationExplanation.riskVariant",
    semanticKey: "relationView.semanticExplanation.riskVariant",
    impactKey: "relationView.relationImpact.riskRelation",
    evidenceLevel: "direct",
    sourceFields: ["Risk.relatedRisks"],
    priority: 3,
  },
  {
    key: "avoidancePrerequisite",
    relationKey: "relationLine.avoidancePrerequisite",
    explanationKey: "relationView.relationExplanation.avoidancePrerequisite",
    semanticKey: "relationView.semanticExplanation.avoidancePrerequisite",
    impactKey: "relationView.relationImpact.avoidanceRelation",
    evidenceLevel: "direct",
    sourceFields: ["Avoidance.relatedAvoidances"],
    priority: 3,
  },
  {
    key: "avoidanceComplement",
    relationKey: "relationLine.avoidanceComplement",
    explanationKey: "relationView.relationExplanation.avoidanceComplement",
    semanticKey: "relationView.semanticExplanation.avoidanceComplement",
    impactKey: "relationView.relationImpact.avoidanceRelation",
    evidenceLevel: "direct",
    sourceFields: ["Avoidance.relatedAvoidances"],
    priority: 3,
  },
  {
    key: "avoidanceAlternative",
    relationKey: "relationLine.avoidanceAlternative",
    explanationKey: "relationView.relationExplanation.avoidanceAlternative",
    semanticKey: "relationView.semanticExplanation.avoidanceAlternative",
    impactKey: "relationView.relationImpact.avoidanceRelation",
    evidenceLevel: "direct",
    sourceFields: ["Avoidance.relatedAvoidances"],
    priority: 3,
  },
  {
    key: "avoidanceMitigatesGap",
    relationKey: "relationLine.avoidanceMitigatesGap",
    explanationKey: "relationView.relationExplanation.avoidanceMitigatesGap",
    semanticKey: "relationView.semanticExplanation.avoidanceMitigatesGap",
    impactKey: "relationView.relationImpact.avoidanceRelation",
    evidenceLevel: "direct",
    sourceFields: ["Avoidance.relatedAvoidances"],
    priority: 3,
  },
  {
    key: "attackToolPrerequisite",
    relationKey: "relationLine.attackToolPrerequisite",
    explanationKey: "relationView.relationExplanation.attackToolPrerequisite",
    semanticKey: "relationView.semanticExplanation.attackToolPrerequisite",
    impactKey: "relationView.relationImpact.attackToolRelation",
    evidenceLevel: "direct",
    sourceFields: ["AttackTool.relatedAttackTools"],
    priority: 3,
  },
  {
    key: "attackToolCoUsed",
    relationKey: "relationLine.attackToolCoUsed",
    explanationKey: "relationView.relationExplanation.attackToolCoUsed",
    semanticKey: "relationView.semanticExplanation.attackToolCoUsed",
    impactKey: "relationView.relationImpact.attackToolRelation",
    evidenceLevel: "direct",
    sourceFields: ["AttackTool.relatedAttackTools"],
    priority: 3,
  },
  {
    key: "attackToolAlternative",
    relationKey: "relationLine.attackToolAlternative",
    explanationKey: "relationView.relationExplanation.attackToolAlternative",
    semanticKey: "relationView.semanticExplanation.attackToolAlternative",
    impactKey: "relationView.relationImpact.attackToolRelation",
    evidenceLevel: "direct",
    sourceFields: ["AttackTool.relatedAttackTools"],
    priority: 3,
  },
  {
    key: "attackToolCapabilityUpgrade",
    relationKey: "relationLine.attackToolCapabilityUpgrade",
    explanationKey:
      "relationView.relationExplanation.attackToolCapabilityUpgrade",
    semanticKey: "relationView.semanticExplanation.attackToolCapabilityUpgrade",
    impactKey: "relationView.relationImpact.attackToolRelation",
    evidenceLevel: "direct",
    sourceFields: ["AttackTool.relatedAttackTools"],
    priority: 3,
  },
  {
    key: "threatActorCoInvolved",
    relationKey: "relationLine.threatActorCoInvolved",
    explanationKey: "relationView.relationExplanation.threatActorCoInvolved",
    semanticKey: "relationView.semanticExplanation.threatActorCoInvolved",
    impactKey: "relationView.relationImpact.threatActorRelation",
    evidenceLevel: "inferred",
    sourceFields: ["ThreatActor.relatedThreatActors"],
    priority: 3,
  },
  {
    key: "buildAttackTool",
    relationKey: "relationLine.buildAttackTool",
    explanationKey: "relationView.relationExplanation.buildAttackTool",
    semanticKey: "relationView.semanticExplanation.buildAttackTool",
    impactKey: "relationView.relationImpact.threatActorTool",
    evidenceLevel: "direct",
    sourceFields: ["ThreatActor.buildAttackTools"],
    priority: 1,
  },
  {
    key: "useAttackTool",
    relationKey: "relationLine.useAttackTool",
    explanationKey: "relationView.relationExplanation.useAttackTool",
    semanticKey: "relationView.semanticExplanation.useAttackTool",
    impactKey: "relationView.relationImpact.threatActorTool",
    evidenceLevel: "direct",
    sourceFields: ["ThreatActor.useAttackTools"],
    priority: 2,
  },
  {
    key: "causeRisk",
    relationKey: "relationLine.causeRisk",
    explanationKey: "relationView.relationExplanation.causeRisk",
    semanticKey: "relationView.semanticExplanation.causeRisk",
    impactKey: "relationView.relationImpact.causeRisk",
    evidenceLevel: "indirect",
    sourceFields: [
      "AttackTool.directCauseRisks",
      "AttackTool.indirectSupportRisks",
      "ThreatActor.directCauseRisks",
      "ThreatActor.indirectSupportRisks",
    ],
    priority: 6,
  },
  {
    key: "relatedTerm",
    relationKey: "relationLine.relatedTerm",
    explanationKey: "relationView.relationExplanation.relatedTerm",
    semanticKey: "relationView.semanticExplanation.relatedTerm",
    impactKey: "relationView.relationImpact.relatedTerm",
    evidenceLevel: "inferred",
    sourceFields: [
      "Term.relatedRisks",
      "Term.relatedAvoidances",
      "Term.relatedAttackTools",
      "Term.relatedThreatActors",
    ],
    priority: 6,
  },
  {
    key: "subRisk",
    relationKey: "relationLine.subRisk",
    explanationKey: "relationView.relationExplanation.subEntity",
    semanticKey: "relationView.semanticExplanation.subEntity",
    impactKey: "relationView.relationImpact.subEntity",
    evidenceLevel: "inferred",
    sourceFields: ["Risk child ID"],
    priority: 6,
  },
  {
    key: "subAvoidance",
    relationKey: "relationLine.subAvoidance",
    explanationKey: "relationView.relationExplanation.subEntity",
    semanticKey: "relationView.semanticExplanation.subEntity",
    impactKey: "relationView.relationImpact.subEntity",
    evidenceLevel: "inferred",
    sourceFields: ["Avoidance child ID"],
    priority: 6,
  },
  {
    key: "subAttackTool",
    relationKey: "relationLine.subAttackTool",
    explanationKey: "relationView.relationExplanation.subEntity",
    semanticKey: "relationView.semanticExplanation.subEntity",
    impactKey: "relationView.relationImpact.subEntity",
    evidenceLevel: "inferred",
    sourceFields: ["AttackTool child ID"],
    priority: 6,
  },
  {
    key: "subThreatActor",
    relationKey: "relationLine.subThreatActor",
    explanationKey: "relationView.relationExplanation.subEntity",
    semanticKey: "relationView.semanticExplanation.subEntity",
    impactKey: "relationView.relationImpact.subEntity",
    evidenceLevel: "inferred",
    sourceFields: ["ThreatActor child ID"],
    priority: 6,
  },
  {
    key: "attackToolMaker",
    relationKey: "relationLine.attackToolMaker",
    explanationKey: "relationView.relationExplanation.attackToolMaker",
    semanticKey: "relationView.semanticExplanation.attackToolMaker",
    impactKey: "relationView.relationImpact.threatActorTool",
    evidenceLevel: "inferred",
    sourceFields: ["ThreatActor.buildAttackTools"],
    priority: 6,
  },
];

export const relationExplanationRuleByKey = new Map(
  relationExplanationRules.map((rule) => [rule.relationKey, rule]),
);

export const relationExplanationCoverage: RelationExplanationCoverageItem[] =
  relationExplanationRules.map(
    ({
      key,
      relationKey,
      explanationKey,
      impactKey,
      evidenceLevel,
      sourceFields,
    }) => ({
      key,
      relationKey,
      explanationKey,
      impactKey,
      evidenceLevel,
      sourceFields,
    }),
  );

export const directRelationLineKeys = new Set(
  relationExplanationRules
    .filter((rule) => rule.evidenceLevel === "direct")
    .map((rule) => rule.relationKey),
);
