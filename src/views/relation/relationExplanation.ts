import {
  RelationType,
  getRelationLineKey,
  type Line,
  type Node,
  type RelationEvidenceLevel,
  type RelationExplanation,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationExplanationHelpersOptions {
  t: Translate;
  nodes: Node[];
}

type RelationLineKey =
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
  | "buildAttackTool"
  | "useAttackTool"
  | "causeRisk"
  | "relatedTerm"
  | "subRisk"
  | "subAvoidance"
  | "subAttackTool"
  | "subThreatActor"
  | "attackToolMaker";

export interface RelationExplanationCoverageItem {
  key: RelationLineKey;
  relationKey: `relationLine.${RelationLineKey}`;
  explanationKey: string;
  impactKey: string;
  evidenceLevel: RelationEvidenceLevel;
  sourceFields: string[];
}

export const createRelationExplanationHelpers = ({
  t,
  nodes,
}: CreateRelationExplanationHelpersOptions) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const relationExplanationCoverage: RelationExplanationCoverageItem[] = [
    {
      key: "avoidanceMeans",
      relationKey: "relationLine.avoidanceMeans",
      explanationKey: "relationView.relationExplanation.avoidance",
      impactKey: "relationView.relationImpact.avoidance",
      evidenceLevel: "direct",
      sourceFields: ["Risk.avoidances", "AttackTool.avoidances"],
    },
    {
      key: "directCauseRisk",
      relationKey: "relationLine.directCauseRisk",
      explanationKey: "relationView.relationExplanation.directCauseRisk",
      impactKey: "relationView.relationImpact.directCauseRisk",
      evidenceLevel: "direct",
      sourceFields: [
        "AttackTool.directCauseRisks",
        "ThreatActor.directCauseRisks",
      ],
    },
    {
      key: "indirectSupportRisk",
      relationKey: "relationLine.indirectSupportRisk",
      explanationKey: "relationView.relationExplanation.indirectSupportRisk",
      impactKey: "relationView.relationImpact.indirectSupportRisk",
      evidenceLevel: "indirect",
      sourceFields: [
        "AttackTool.indirectSupportRisks",
        "ThreatActor.indirectSupportRisks",
      ],
    },
    {
      key: "riskPrerequisite",
      relationKey: "relationLine.riskPrerequisite",
      explanationKey: "relationView.relationExplanation.riskPrerequisite",
      impactKey: "relationView.relationImpact.riskRelation",
      evidenceLevel: "direct",
      sourceFields: ["Risk.relatedRisks"],
    },
    {
      key: "riskCoOccurrence",
      relationKey: "relationLine.riskCoOccurrence",
      explanationKey: "relationView.relationExplanation.riskCoOccurrence",
      impactKey: "relationView.relationImpact.riskRelation",
      evidenceLevel: "direct",
      sourceFields: ["Risk.relatedRisks"],
    },
    {
      key: "riskEscalation",
      relationKey: "relationLine.riskEscalation",
      explanationKey: "relationView.relationExplanation.riskEscalation",
      impactKey: "relationView.relationImpact.riskRelation",
      evidenceLevel: "direct",
      sourceFields: ["Risk.relatedRisks"],
    },
    {
      key: "riskVariant",
      relationKey: "relationLine.riskVariant",
      explanationKey: "relationView.relationExplanation.riskVariant",
      impactKey: "relationView.relationImpact.riskRelation",
      evidenceLevel: "direct",
      sourceFields: ["Risk.relatedRisks"],
    },
    {
      key: "avoidancePrerequisite",
      relationKey: "relationLine.avoidancePrerequisite",
      explanationKey: "relationView.relationExplanation.avoidancePrerequisite",
      impactKey: "relationView.relationImpact.avoidanceRelation",
      evidenceLevel: "direct",
      sourceFields: ["Avoidance.relatedAvoidances"],
    },
    {
      key: "avoidanceComplement",
      relationKey: "relationLine.avoidanceComplement",
      explanationKey: "relationView.relationExplanation.avoidanceComplement",
      impactKey: "relationView.relationImpact.avoidanceRelation",
      evidenceLevel: "direct",
      sourceFields: ["Avoidance.relatedAvoidances"],
    },
    {
      key: "avoidanceAlternative",
      relationKey: "relationLine.avoidanceAlternative",
      explanationKey: "relationView.relationExplanation.avoidanceAlternative",
      impactKey: "relationView.relationImpact.avoidanceRelation",
      evidenceLevel: "direct",
      sourceFields: ["Avoidance.relatedAvoidances"],
    },
    {
      key: "avoidanceMitigatesGap",
      relationKey: "relationLine.avoidanceMitigatesGap",
      explanationKey: "relationView.relationExplanation.avoidanceMitigatesGap",
      impactKey: "relationView.relationImpact.avoidanceRelation",
      evidenceLevel: "direct",
      sourceFields: ["Avoidance.relatedAvoidances"],
    },
    {
      key: "attackToolPrerequisite",
      relationKey: "relationLine.attackToolPrerequisite",
      explanationKey: "relationView.relationExplanation.attackToolPrerequisite",
      impactKey: "relationView.relationImpact.attackToolRelation",
      evidenceLevel: "direct",
      sourceFields: ["AttackTool.relatedAttackTools"],
    },
    {
      key: "attackToolCoUsed",
      relationKey: "relationLine.attackToolCoUsed",
      explanationKey: "relationView.relationExplanation.attackToolCoUsed",
      impactKey: "relationView.relationImpact.attackToolRelation",
      evidenceLevel: "direct",
      sourceFields: ["AttackTool.relatedAttackTools"],
    },
    {
      key: "attackToolAlternative",
      relationKey: "relationLine.attackToolAlternative",
      explanationKey: "relationView.relationExplanation.attackToolAlternative",
      impactKey: "relationView.relationImpact.attackToolRelation",
      evidenceLevel: "direct",
      sourceFields: ["AttackTool.relatedAttackTools"],
    },
    {
      key: "attackToolCapabilityUpgrade",
      relationKey: "relationLine.attackToolCapabilityUpgrade",
      explanationKey: "relationView.relationExplanation.attackToolCapabilityUpgrade",
      impactKey: "relationView.relationImpact.attackToolRelation",
      evidenceLevel: "direct",
      sourceFields: ["AttackTool.relatedAttackTools"],
    },
    {
      key: "buildAttackTool",
      relationKey: "relationLine.buildAttackTool",
      explanationKey: "relationView.relationExplanation.buildAttackTool",
      impactKey: "relationView.relationImpact.threatActorTool",
      evidenceLevel: "direct",
      sourceFields: ["ThreatActor.buildAttackTools"],
    },
    {
      key: "useAttackTool",
      relationKey: "relationLine.useAttackTool",
      explanationKey: "relationView.relationExplanation.useAttackTool",
      impactKey: "relationView.relationImpact.threatActorTool",
      evidenceLevel: "direct",
      sourceFields: ["ThreatActor.useAttackTools"],
    },
    {
      key: "causeRisk",
      relationKey: "relationLine.causeRisk",
      explanationKey: "relationView.relationExplanation.causeRisk",
      impactKey: "relationView.relationImpact.causeRisk",
      evidenceLevel: "indirect",
      sourceFields: [
        "AttackTool.directCauseRisks",
        "AttackTool.indirectSupportRisks",
        "ThreatActor.directCauseRisks",
        "ThreatActor.indirectSupportRisks",
      ],
    },
    {
      key: "relatedTerm",
      relationKey: "relationLine.relatedTerm",
      explanationKey: "relationView.relationExplanation.relatedTerm",
      impactKey: "relationView.relationImpact.relatedTerm",
      evidenceLevel: "inferred",
      sourceFields: [
        "Term.relatedRisks",
        "Term.relatedAvoidances",
        "Term.relatedAttackTools",
        "Term.relatedThreatActors",
      ],
    },
    {
      key: "subRisk",
      relationKey: "relationLine.subRisk",
      explanationKey: "relationView.relationExplanation.subEntity",
      impactKey: "relationView.relationImpact.subEntity",
      evidenceLevel: "inferred",
      sourceFields: ["Risk child ID"],
    },
    {
      key: "subAvoidance",
      relationKey: "relationLine.subAvoidance",
      explanationKey: "relationView.relationExplanation.subEntity",
      impactKey: "relationView.relationImpact.subEntity",
      evidenceLevel: "inferred",
      sourceFields: ["Avoidance child ID"],
    },
    {
      key: "subAttackTool",
      relationKey: "relationLine.subAttackTool",
      explanationKey: "relationView.relationExplanation.subEntity",
      impactKey: "relationView.relationImpact.subEntity",
      evidenceLevel: "inferred",
      sourceFields: ["AttackTool child ID"],
    },
    {
      key: "subThreatActor",
      relationKey: "relationLine.subThreatActor",
      explanationKey: "relationView.relationExplanation.subEntity",
      impactKey: "relationView.relationImpact.subEntity",
      evidenceLevel: "inferred",
      sourceFields: ["ThreatActor child ID"],
    },
    {
      key: "attackToolMaker",
      relationKey: "relationLine.attackToolMaker",
      explanationKey: "relationView.relationExplanation.attackToolMaker",
      impactKey: "relationView.relationImpact.threatActorTool",
      evidenceLevel: "inferred",
      sourceFields: ["ThreatActor.buildAttackTools"],
    },
  ];

  const getLineEndpointTypes = (
    line: Line,
    sourceType?: string,
    targetType?: string
  ) => ({
    fromType: sourceType ?? nodeById.get(line.from)?.type,
    toType: targetType ?? nodeById.get(line.to)?.type,
  });

  const getNodeDisplayTitle = (id: string) => {
    const text = nodeById.get(id)?.text ?? id;
    const lines = text
      .replace(/<br\s*\/?>/gi, "\n")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    return lines.length > 1 ? lines.slice(1).join(" ") : (lines[0] ?? id);
  };

  const getRelationSourceFields = (
    line: Line,
    sourceType?: string,
    targetType?: string
  ) => {
    const { fromType, toType } = getLineEndpointTypes(
      line,
      sourceType,
      targetType
    );
    const fields = new Set<string>();

    if (getRelationLineKey(line) === "relationLine.avoidanceMeans") {
      if (fromType === RelationType.risk) fields.add("Risk.avoidances");
      if (
        fromType === RelationType.attackTool ||
        toType === RelationType.attackTool
      )
        fields.add("AttackTool.avoidances");
    }
    if (getRelationLineKey(line) === "relationLine.directCauseRisk") {
      if (fromType === RelationType.attackTool)
        fields.add("AttackTool.directCauseRisks");
      if (fromType === RelationType.threatActor)
        fields.add("ThreatActor.directCauseRisks");
    }
    if (getRelationLineKey(line) === "relationLine.indirectSupportRisk") {
      if (fromType === RelationType.attackTool)
        fields.add("AttackTool.indirectSupportRisks");
      if (fromType === RelationType.threatActor)
        fields.add("ThreatActor.indirectSupportRisks");
    }
    if (
      getRelationLineKey(line) === "relationLine.riskPrerequisite" ||
      getRelationLineKey(line) === "relationLine.riskCoOccurrence" ||
      getRelationLineKey(line) === "relationLine.riskEscalation" ||
      getRelationLineKey(line) === "relationLine.riskVariant"
    ) {
      fields.add("Risk.relatedRisks");
    }
    if (
      getRelationLineKey(line) === "relationLine.avoidancePrerequisite" ||
      getRelationLineKey(line) === "relationLine.avoidanceComplement" ||
      getRelationLineKey(line) === "relationLine.avoidanceAlternative" ||
      getRelationLineKey(line) === "relationLine.avoidanceMitigatesGap"
    ) {
      fields.add("Avoidance.relatedAvoidances");
    }
    if (
      getRelationLineKey(line) === "relationLine.attackToolPrerequisite" ||
      getRelationLineKey(line) === "relationLine.attackToolCoUsed" ||
      getRelationLineKey(line) === "relationLine.attackToolAlternative" ||
      getRelationLineKey(line) === "relationLine.attackToolCapabilityUpgrade"
    ) {
      fields.add("AttackTool.relatedAttackTools");
    }
    if (getRelationLineKey(line) === "relationLine.buildAttackTool")
      fields.add("ThreatActor.buildAttackTools");
    if (getRelationLineKey(line) === "relationLine.useAttackTool")
      fields.add("ThreatActor.useAttackTools");
    if (getRelationLineKey(line) === "relationLine.relatedTerm") {
      if (fromType === RelationType.term && toType === RelationType.risk)
        fields.add("Term.relatedRisks");
      if (fromType === RelationType.term && toType === RelationType.avoidance)
        fields.add("Term.relatedAvoidances");
      if (fromType === RelationType.term && toType === RelationType.attackTool)
        fields.add("Term.relatedAttackTools");
      if (fromType === RelationType.term && toType === RelationType.threatActor)
        fields.add("Term.relatedThreatActors");
    }
    if (getRelationLineKey(line) === "relationLine.attackToolMaker")
      fields.add("ThreatActor.buildAttackTools");
    if (getRelationLineKey(line) === "relationLine.causeRisk") {
      if (fromType === RelationType.attackTool) {
        fields.add("AttackTool.directCauseRisks");
        fields.add("AttackTool.indirectSupportRisks");
      }
      if (fromType === RelationType.threatActor) {
        fields.add("ThreatActor.directCauseRisks");
        fields.add("ThreatActor.indirectSupportRisks");
      }
    }
    if (getRelationLineKey(line) === "relationLine.subRisk") fields.add("Risk child ID");
    if (getRelationLineKey(line) === "relationLine.subAvoidance")
      fields.add("Avoidance child ID");
    if (getRelationLineKey(line) === "relationLine.subAttackTool")
      fields.add("AttackTool child ID");
    if (getRelationLineKey(line) === "relationLine.subThreatActor")
      fields.add("ThreatActor child ID");

    return [...fields];
  };

  const getRelationEvidenceLevel = (line: Line): RelationEvidenceLevel => {
    if (
      getRelationLineKey(line) === "relationLine.directCauseRisk" ||
      getRelationLineKey(line) === "relationLine.buildAttackTool" ||
      getRelationLineKey(line) === "relationLine.useAttackTool" ||
      getRelationLineKey(line) === "relationLine.avoidanceMeans" ||
      getRelationLineKey(line) === "relationLine.riskPrerequisite" ||
      getRelationLineKey(line) === "relationLine.riskCoOccurrence" ||
      getRelationLineKey(line) === "relationLine.riskEscalation" ||
      getRelationLineKey(line) === "relationLine.riskVariant" ||
      getRelationLineKey(line) === "relationLine.avoidancePrerequisite" ||
      getRelationLineKey(line) === "relationLine.avoidanceComplement" ||
      getRelationLineKey(line) === "relationLine.avoidanceAlternative" ||
      getRelationLineKey(line) === "relationLine.avoidanceMitigatesGap" ||
      getRelationLineKey(line) === "relationLine.attackToolPrerequisite" ||
      getRelationLineKey(line) === "relationLine.attackToolCoUsed" ||
      getRelationLineKey(line) === "relationLine.attackToolAlternative" ||
      getRelationLineKey(line) === "relationLine.attackToolCapabilityUpgrade"
    ) {
      return "direct";
    }
    if (
      getRelationLineKey(line) === "relationLine.indirectSupportRisk" ||
      getRelationLineKey(line) === "relationLine.causeRisk"
    ) {
      return "indirect";
    }
    if (
      getRelationLineKey(line) === "relationLine.relatedTerm" ||
      getRelationLineKey(line) === "relationLine.subRisk" ||
      getRelationLineKey(line) === "relationLine.subAvoidance" ||
      getRelationLineKey(line) === "relationLine.subAttackTool" ||
      getRelationLineKey(line) === "relationLine.subThreatActor" ||
      getRelationLineKey(line) === "relationLine.attackToolMaker"
    ) {
      return "inferred";
    }
    return "review";
  };

  const getRelationPriority = (lineText: string) => {
    if (
      lineText === "relationLine.directCauseRisk" ||
      lineText === t("relationLine.directCauseRisk")
    )
      return 0;
    if (
      lineText === "relationLine.buildAttackTool" ||
      lineText === t("relationLine.buildAttackTool")
    )
      return 1;
    if (
      lineText === "relationLine.useAttackTool" ||
      lineText === t("relationLine.useAttackTool")
    )
      return 2;
    if (
      lineText === "relationLine.riskPrerequisite" ||
      lineText === "relationLine.riskCoOccurrence" ||
      lineText === "relationLine.riskEscalation" ||
      lineText === "relationLine.riskVariant" ||
      lineText === "relationLine.avoidancePrerequisite" ||
      lineText === "relationLine.avoidanceComplement" ||
      lineText === "relationLine.avoidanceAlternative" ||
      lineText === "relationLine.avoidanceMitigatesGap" ||
      lineText === "relationLine.attackToolPrerequisite" ||
      lineText === "relationLine.attackToolCoUsed" ||
      lineText === "relationLine.attackToolAlternative" ||
      lineText === "relationLine.attackToolCapabilityUpgrade" ||
      lineText === t("relationLine.riskPrerequisite") ||
      lineText === t("relationLine.riskCoOccurrence") ||
      lineText === t("relationLine.riskEscalation") ||
      lineText === t("relationLine.riskVariant") ||
      lineText === t("relationLine.avoidancePrerequisite") ||
      lineText === t("relationLine.avoidanceComplement") ||
      lineText === t("relationLine.avoidanceAlternative") ||
      lineText === t("relationLine.avoidanceMitigatesGap") ||
      lineText === t("relationLine.attackToolPrerequisite") ||
      lineText === t("relationLine.attackToolCoUsed") ||
      lineText === t("relationLine.attackToolAlternative") ||
      lineText === t("relationLine.attackToolCapabilityUpgrade")
    )
      return 3;
    if (
      lineText === "relationLine.avoidanceMeans" ||
      lineText === t("relationLine.avoidanceMeans")
    )
      return 4;
    if (
      lineText === "relationLine.indirectSupportRisk" ||
      lineText === t("relationLine.indirectSupportRisk")
    )
      return 5;
    return 6;
  };

  const isDirectRelationLine = (lineText: string) =>
    [
      "relationLine.directCauseRisk",
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
      "relationLine.buildAttackTool",
      "relationLine.useAttackTool",
      t("relationLine.directCauseRisk"),
      t("relationLine.riskPrerequisite"),
      t("relationLine.riskCoOccurrence"),
      t("relationLine.riskEscalation"),
      t("relationLine.riskVariant"),
      t("relationLine.avoidancePrerequisite"),
      t("relationLine.avoidanceComplement"),
      t("relationLine.avoidanceAlternative"),
      t("relationLine.avoidanceMitigatesGap"),
      t("relationLine.attackToolPrerequisite"),
      t("relationLine.attackToolCoUsed"),
      t("relationLine.attackToolAlternative"),
      t("relationLine.attackToolCapabilityUpgrade"),
      t("relationLine.buildAttackTool"),
      t("relationLine.useAttackTool"),
    ].includes(lineText);

  const getRelationExplanationText = (
    line: Line,
    sourceType?: string,
    targetType?: string
  ) => {
    const { fromType, toType } = getLineEndpointTypes(
      line,
      sourceType,
      targetType
    );
    const prefix = "relationView.relationExplanation";

    if (getRelationLineKey(line) === "relationLine.avoidanceMeans") {
      if (fromType === RelationType.risk) return t(`${prefix}.riskAvoidance`);
      if (
        fromType === RelationType.attackTool ||
        toType === RelationType.attackTool
      )
        return t(`${prefix}.toolAvoidance`);
      return t(`${prefix}.avoidance`);
    }
    if (getRelationLineKey(line) === "relationLine.directCauseRisk")
      return t(`${prefix}.directCauseRisk`);
    if (getRelationLineKey(line) === "relationLine.indirectSupportRisk")
      return t(`${prefix}.indirectSupportRisk`);
    if (getRelationLineKey(line) === "relationLine.riskPrerequisite")
      return t(`${prefix}.riskPrerequisite`);
    if (getRelationLineKey(line) === "relationLine.riskCoOccurrence")
      return t(`${prefix}.riskCoOccurrence`);
    if (getRelationLineKey(line) === "relationLine.riskEscalation")
      return t(`${prefix}.riskEscalation`);
    if (getRelationLineKey(line) === "relationLine.riskVariant")
      return t(`${prefix}.riskVariant`);
    if (getRelationLineKey(line) === "relationLine.avoidancePrerequisite")
      return t(`${prefix}.avoidancePrerequisite`);
    if (getRelationLineKey(line) === "relationLine.avoidanceComplement")
      return t(`${prefix}.avoidanceComplement`);
    if (getRelationLineKey(line) === "relationLine.avoidanceAlternative")
      return t(`${prefix}.avoidanceAlternative`);
    if (getRelationLineKey(line) === "relationLine.avoidanceMitigatesGap")
      return t(`${prefix}.avoidanceMitigatesGap`);
    if (getRelationLineKey(line) === "relationLine.attackToolPrerequisite")
      return t(`${prefix}.attackToolPrerequisite`);
    if (getRelationLineKey(line) === "relationLine.attackToolCoUsed")
      return t(`${prefix}.attackToolCoUsed`);
    if (getRelationLineKey(line) === "relationLine.attackToolAlternative")
      return t(`${prefix}.attackToolAlternative`);
    if (getRelationLineKey(line) === "relationLine.attackToolCapabilityUpgrade")
      return t(`${prefix}.attackToolCapabilityUpgrade`);
    if (getRelationLineKey(line) === "relationLine.buildAttackTool")
      return t(`${prefix}.buildAttackTool`);
    if (getRelationLineKey(line) === "relationLine.useAttackTool")
      return t(`${prefix}.useAttackTool`);
    if (getRelationLineKey(line) === "relationLine.causeRisk")
      return t(`${prefix}.causeRisk`);
    if (getRelationLineKey(line) === "relationLine.relatedTerm")
      return t(`${prefix}.relatedTerm`);
    if (
      getRelationLineKey(line) === "relationLine.subRisk" ||
      getRelationLineKey(line) === "relationLine.subAvoidance" ||
      getRelationLineKey(line) === "relationLine.subAttackTool" ||
      getRelationLineKey(line) === "relationLine.subThreatActor"
    ) {
      return t(`${prefix}.subEntity`);
    }
    if (getRelationLineKey(line) === "relationLine.attackToolMaker")
      return t(`${prefix}.attackToolMaker`);
    return t(`${prefix}.review`);
  };

  const getSemanticRelationExplanation = (
    line: Line,
    sourceType?: string,
    targetType?: string
  ) => {
    const { fromType, toType } = getLineEndpointTypes(
      line,
      sourceType,
      targetType
    );
    const params = {
      fromId: line.from,
      fromTitle: getNodeDisplayTitle(line.from),
      toId: line.to,
      toTitle: getNodeDisplayTitle(line.to),
      relation: line.text,
    };
    const prefix = "relationView.semanticExplanation";

    if (getRelationLineKey(line) === "relationLine.avoidanceMeans") {
      if (fromType === RelationType.risk)
        return t(`${prefix}.riskAvoidance`, params);
      if (
        fromType === RelationType.attackTool ||
        toType === RelationType.attackTool
      )
        return t(`${prefix}.toolAvoidance`, params);
      return t(`${prefix}.avoidance`, params);
    }
    if (getRelationLineKey(line) === "relationLine.directCauseRisk")
      return t(`${prefix}.directCauseRisk`, params);
    if (getRelationLineKey(line) === "relationLine.indirectSupportRisk")
      return t(`${prefix}.indirectSupportRisk`, params);
    if (getRelationLineKey(line) === "relationLine.riskPrerequisite")
      return t(`${prefix}.riskPrerequisite`, params);
    if (getRelationLineKey(line) === "relationLine.riskCoOccurrence")
      return t(`${prefix}.riskCoOccurrence`, params);
    if (getRelationLineKey(line) === "relationLine.riskEscalation")
      return t(`${prefix}.riskEscalation`, params);
    if (getRelationLineKey(line) === "relationLine.riskVariant")
      return t(`${prefix}.riskVariant`, params);
    if (getRelationLineKey(line) === "relationLine.avoidancePrerequisite")
      return t(`${prefix}.avoidancePrerequisite`, params);
    if (getRelationLineKey(line) === "relationLine.avoidanceComplement")
      return t(`${prefix}.avoidanceComplement`, params);
    if (getRelationLineKey(line) === "relationLine.avoidanceAlternative")
      return t(`${prefix}.avoidanceAlternative`, params);
    if (getRelationLineKey(line) === "relationLine.avoidanceMitigatesGap")
      return t(`${prefix}.avoidanceMitigatesGap`, params);
    if (getRelationLineKey(line) === "relationLine.attackToolPrerequisite")
      return t(`${prefix}.attackToolPrerequisite`, params);
    if (getRelationLineKey(line) === "relationLine.attackToolCoUsed")
      return t(`${prefix}.attackToolCoUsed`, params);
    if (getRelationLineKey(line) === "relationLine.attackToolAlternative")
      return t(`${prefix}.attackToolAlternative`, params);
    if (getRelationLineKey(line) === "relationLine.attackToolCapabilityUpgrade")
      return t(`${prefix}.attackToolCapabilityUpgrade`, params);
    if (getRelationLineKey(line) === "relationLine.buildAttackTool")
      return t(`${prefix}.buildAttackTool`, params);
    if (getRelationLineKey(line) === "relationLine.useAttackTool")
      return t(`${prefix}.useAttackTool`, params);
    if (getRelationLineKey(line) === "relationLine.causeRisk")
      return t(`${prefix}.causeRisk`, params);
    if (getRelationLineKey(line) === "relationLine.relatedTerm")
      return t(`${prefix}.relatedTerm`, params);
    if (
      getRelationLineKey(line) === "relationLine.subRisk" ||
      getRelationLineKey(line) === "relationLine.subAvoidance" ||
      getRelationLineKey(line) === "relationLine.subAttackTool" ||
      getRelationLineKey(line) === "relationLine.subThreatActor"
    ) {
      return t(`${prefix}.subEntity`, params);
    }
    if (getRelationLineKey(line) === "relationLine.attackToolMaker")
      return t(`${prefix}.attackToolMaker`, params);
    return t(`${prefix}.review`, params);
  };

  const getRelationImpactHint = (line: Line) => {
    const prefix = "relationView.relationImpact";

    if (getRelationLineKey(line) === "relationLine.avoidanceMeans")
      return t(`${prefix}.avoidance`);
    if (getRelationLineKey(line) === "relationLine.directCauseRisk")
      return t(`${prefix}.directCauseRisk`);
    if (getRelationLineKey(line) === "relationLine.indirectSupportRisk")
      return t(`${prefix}.indirectSupportRisk`);
    if (
      getRelationLineKey(line) === "relationLine.riskPrerequisite" ||
      getRelationLineKey(line) === "relationLine.riskCoOccurrence" ||
      getRelationLineKey(line) === "relationLine.riskEscalation" ||
      getRelationLineKey(line) === "relationLine.riskVariant"
    ) {
      return t(`${prefix}.riskRelation`);
    }
    if (
      getRelationLineKey(line) === "relationLine.avoidancePrerequisite" ||
      getRelationLineKey(line) === "relationLine.avoidanceComplement" ||
      getRelationLineKey(line) === "relationLine.avoidanceAlternative" ||
      getRelationLineKey(line) === "relationLine.avoidanceMitigatesGap"
    ) {
      return t(`${prefix}.avoidanceRelation`);
    }
    if (
      getRelationLineKey(line) === "relationLine.attackToolPrerequisite" ||
      getRelationLineKey(line) === "relationLine.attackToolCoUsed" ||
      getRelationLineKey(line) === "relationLine.attackToolAlternative" ||
      getRelationLineKey(line) === "relationLine.attackToolCapabilityUpgrade"
    ) {
      return t(`${prefix}.attackToolRelation`);
    }
    if (
      getRelationLineKey(line) === "relationLine.buildAttackTool" ||
      getRelationLineKey(line) === "relationLine.useAttackTool"
    ) {
      return t(`${prefix}.threatActorTool`);
    }
    if (getRelationLineKey(line) === "relationLine.causeRisk")
      return t(`${prefix}.causeRisk`);
    if (getRelationLineKey(line) === "relationLine.relatedTerm")
      return t(`${prefix}.relatedTerm`);
    if (
      getRelationLineKey(line) === "relationLine.subRisk" ||
      getRelationLineKey(line) === "relationLine.subAvoidance" ||
      getRelationLineKey(line) === "relationLine.subAttackTool" ||
      getRelationLineKey(line) === "relationLine.subThreatActor"
    ) {
      return t(`${prefix}.subEntity`);
    }
    return t(`${prefix}.review`);
  };

  const explainRelation = (
    line: Line,
    sourceType?: string,
    targetType?: string
  ): RelationExplanation => {
    const sourceFields = getRelationSourceFields(line, sourceType, targetType);
    const qualityFlags =
      sourceFields.length === 0
        ? [t("relationView.qualityFlagMissingSource")]
        : [];
    const evidenceLevel = getRelationEvidenceLevel(line);

    if (evidenceLevel === "review") {
      qualityFlags.push(t("relationView.qualityFlagReview"));
    }

    return {
      relationKey: `${line.from}::${getRelationLineKey(line)}::${line.to}`,
      fromId: line.from,
      toId: line.to,
      relationType: line.text,
      sourceFields,
      evidenceLevel,
      explanation: getRelationExplanationText(line, sourceType, targetType),
      semanticExplanation: getSemanticRelationExplanation(
        line,
        sourceType,
        targetType
      ),
      impactHint: getRelationImpactHint(line),
      qualityFlags,
    };
  };

  const formatEvidenceLevel = (level: RelationEvidenceLevel | string) =>
    t(`relationView.evidenceLevel.${level}`);

  return {
    explainRelation,
    formatEvidenceLevel,
    getRelationEvidenceLevel,
    getRelationPriority,
    getRelationSourceFields,
    isDirectRelationLine,
    relationExplanationCoverage,
  };
};
