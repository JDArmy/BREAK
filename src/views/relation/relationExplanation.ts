import {
  RelationType,
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

export const createRelationExplanationHelpers = ({
  t,
  nodes,
}: CreateRelationExplanationHelpersOptions) => {
  const getLineEndpointTypes = (line: Line, sourceType?: string, targetType?: string) => ({
    fromType: sourceType ?? nodes.find((node) => node.id === line.from)?.type,
    toType: targetType ?? nodes.find((node) => node.id === line.to)?.type,
  });

  const getRelationSourceFields = (line: Line, sourceType?: string, targetType?: string) => {
    const { fromType, toType } = getLineEndpointTypes(line, sourceType, targetType);
    const fields = new Set<string>();

    if (line.text === t("relationLine.avoidanceMeans")) {
      if (fromType === RelationType.risk) fields.add("Risk.avoidances");
      if (fromType === RelationType.attackTool || toType === RelationType.attackTool) fields.add("AttackTool.avoidances");
    }
    if (line.text === t("relationLine.directCauseRisk")) {
      if (fromType === RelationType.attackTool) fields.add("AttackTool.directCauseRisks");
      if (fromType === RelationType.threatActor) fields.add("ThreatActor.directCauseRisks");
    }
    if (line.text === t("relationLine.indirectSupportRisk")) {
      if (fromType === RelationType.attackTool) fields.add("AttackTool.indirectSupportRisks");
      if (fromType === RelationType.threatActor) fields.add("ThreatActor.indirectSupportRisks");
    }
    if (line.text === t("relationLine.buildAttackTool")) fields.add("ThreatActor.buildAttackTools");
    if (line.text === t("relationLine.useAttackTool")) fields.add("ThreatActor.useAttackTools");
    if (line.text === t("relationLine.relatedTerm")) {
      if (fromType === RelationType.term && toType === RelationType.risk) fields.add("Term.relatedRisks");
      if (fromType === RelationType.term && toType === RelationType.avoidance) fields.add("Term.relatedAvoidances");
      if (fromType === RelationType.term && toType === RelationType.attackTool) fields.add("Term.relatedAttackTools");
      if (fromType === RelationType.term && toType === RelationType.threatActor) fields.add("Term.relatedThreatActors");
    }
    if (line.text === t("relationLine.attackToolMaker")) fields.add("ThreatActor.buildAttackTools");
    if (line.text === t("relationLine.causeRisk")) {
      if (fromType === RelationType.attackTool) {
        fields.add("AttackTool.directCauseRisks");
        fields.add("AttackTool.indirectSupportRisks");
      }
      if (fromType === RelationType.threatActor) {
        fields.add("ThreatActor.directCauseRisks");
        fields.add("ThreatActor.indirectSupportRisks");
      }
    }
    if (line.text === t("relationLine.subRisk")) fields.add("Risk child ID");
    if (line.text === t("relationLine.subAvoidance")) fields.add("Avoidance child ID");
    if (line.text === t("relationLine.subAttackTool")) fields.add("AttackTool child ID");
    if (line.text === t("relationLine.subThreatActor")) fields.add("ThreatActor child ID");

    return [...fields];
  };

  const getRelationEvidenceLevel = (line: Line): RelationEvidenceLevel => {
    if (
      line.text === t("relationLine.directCauseRisk") ||
      line.text === t("relationLine.buildAttackTool") ||
      line.text === t("relationLine.useAttackTool") ||
      line.text === t("relationLine.avoidanceMeans")
    ) {
      return "direct";
    }
    if (line.text === t("relationLine.indirectSupportRisk") || line.text === t("relationLine.causeRisk")) {
      return "indirect";
    }
    if (
      line.text === t("relationLine.relatedTerm") ||
      line.text === t("relationLine.subRisk") ||
      line.text === t("relationLine.subAvoidance") ||
      line.text === t("relationLine.subAttackTool") ||
      line.text === t("relationLine.subThreatActor")
    ) {
      return "inferred";
    }
    return "review";
  };

  const getRelationPriority = (lineText: string) => {
    if (lineText === t("relationLine.directCauseRisk")) return 0;
    if (lineText === t("relationLine.buildAttackTool")) return 1;
    if (lineText === t("relationLine.useAttackTool")) return 2;
    if (lineText === t("relationLine.avoidanceMeans")) return 3;
    if (lineText === t("relationLine.indirectSupportRisk")) return 4;
    return 5;
  };

  const isDirectRelationLine = (lineText: string) =>
    [t("relationLine.directCauseRisk"), t("relationLine.buildAttackTool"), t("relationLine.useAttackTool")].includes(
      lineText
    );

  const getRelationExplanationText = (line: Line, sourceType?: string, targetType?: string) => {
    const { fromType, toType } = getLineEndpointTypes(line, sourceType, targetType);
    const prefix = "relationView.relationExplanation";

    if (line.text === t("relationLine.avoidanceMeans")) {
      if (fromType === RelationType.risk) return t(`${prefix}.riskAvoidance`);
      if (fromType === RelationType.attackTool || toType === RelationType.attackTool) return t(`${prefix}.toolAvoidance`);
      return t(`${prefix}.avoidance`);
    }
    if (line.text === t("relationLine.directCauseRisk")) return t(`${prefix}.directCauseRisk`);
    if (line.text === t("relationLine.indirectSupportRisk")) return t(`${prefix}.indirectSupportRisk`);
    if (line.text === t("relationLine.buildAttackTool")) return t(`${prefix}.buildAttackTool`);
    if (line.text === t("relationLine.useAttackTool")) return t(`${prefix}.useAttackTool`);
    if (line.text === t("relationLine.causeRisk")) return t(`${prefix}.causeRisk`);
    if (line.text === t("relationLine.relatedTerm")) return t(`${prefix}.relatedTerm`);
    if (
      line.text === t("relationLine.subRisk") ||
      line.text === t("relationLine.subAvoidance") ||
      line.text === t("relationLine.subAttackTool") ||
      line.text === t("relationLine.subThreatActor")
    ) {
      return t(`${prefix}.subEntity`);
    }
    if (line.text === t("relationLine.attackToolMaker")) return t(`${prefix}.attackToolMaker`);
    return t(`${prefix}.review`);
  };

  const getRelationImpactHint = (line: Line) => {
    const prefix = "relationView.relationImpact";

    if (line.text === t("relationLine.avoidanceMeans")) return t(`${prefix}.avoidance`);
    if (line.text === t("relationLine.directCauseRisk")) return t(`${prefix}.directCauseRisk`);
    if (line.text === t("relationLine.indirectSupportRisk")) return t(`${prefix}.indirectSupportRisk`);
    if (line.text === t("relationLine.buildAttackTool") || line.text === t("relationLine.useAttackTool")) {
      return t(`${prefix}.threatActorTool`);
    }
    if (line.text === t("relationLine.causeRisk")) return t(`${prefix}.causeRisk`);
    if (line.text === t("relationLine.relatedTerm")) return t(`${prefix}.relatedTerm`);
    if (
      line.text === t("relationLine.subRisk") ||
      line.text === t("relationLine.subAvoidance") ||
      line.text === t("relationLine.subAttackTool") ||
      line.text === t("relationLine.subThreatActor")
    ) {
      return t(`${prefix}.subEntity`);
    }
    return t(`${prefix}.review`);
  };

  const explainRelation = (line: Line, sourceType?: string, targetType?: string): RelationExplanation => {
    const sourceFields = getRelationSourceFields(line, sourceType, targetType);
    const qualityFlags = sourceFields.length === 0 ? [t("relationView.qualityFlagMissingSource")] : [];
    const evidenceLevel = getRelationEvidenceLevel(line);

    if (evidenceLevel === "review") {
      qualityFlags.push(t("relationView.qualityFlagReview"));
    }

    return {
      relationKey: `${line.from}::${line.text}::${line.to}`,
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

  const formatEvidenceLevel = (level: RelationEvidenceLevel | string) => t(`relationView.evidenceLevel.${level}`);

  return {
    explainRelation,
    formatEvidenceLevel,
    getRelationEvidenceLevel,
    getRelationPriority,
    getRelationSourceFields,
    isDirectRelationLine,
  };
};
