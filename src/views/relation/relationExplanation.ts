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
    fromType: sourceType ?? nodes.find((node) => node.id === line.from)?.type,
    toType: targetType ?? nodes.find((node) => node.id === line.to)?.type,
  });

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
      getRelationLineKey(line) === "relationLine.avoidanceMeans"
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
      lineText === "relationLine.avoidanceMeans" ||
      lineText === t("relationLine.avoidanceMeans")
    )
      return 3;
    if (
      lineText === "relationLine.indirectSupportRisk" ||
      lineText === t("relationLine.indirectSupportRisk")
    )
      return 4;
    return 5;
  };

  const isDirectRelationLine = (lineText: string) =>
    [
      "relationLine.directCauseRisk",
      "relationLine.buildAttackTool",
      "relationLine.useAttackTool",
      t("relationLine.directCauseRisk"),
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

  const getRelationImpactHint = (line: Line) => {
    const prefix = "relationView.relationImpact";

    if (getRelationLineKey(line) === "relationLine.avoidanceMeans")
      return t(`${prefix}.avoidance`);
    if (getRelationLineKey(line) === "relationLine.directCauseRisk")
      return t(`${prefix}.directCauseRisk`);
    if (getRelationLineKey(line) === "relationLine.indirectSupportRisk")
      return t(`${prefix}.indirectSupportRisk`);
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
