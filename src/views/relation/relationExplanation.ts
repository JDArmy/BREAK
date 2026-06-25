import {
  RelationType,
  getRelationLineKey,
  type Line,
  type Node,
  type RelationEvidenceLevel,
  type RelationExplanation,
} from "@/views/relation/relationTypes";
import {
  directRelationLineKeys,
  relationExplanationCoverage,
  relationExplanationRuleByKey,
  type RelationLineKey,
} from "@/views/relation/relationExplanationRules";

type Translate = (key: string, params?: Record<string, unknown>) => string;
type RelationLineRuleKey = `relationLine.${RelationLineKey}`;

/** 将 getRelationLineKey 的宽 string 结果收窄为规则表 key 类型 */
const asRuleKey = (key: string) => key as RelationLineRuleKey;

interface CreateRelationExplanationHelpersOptions {
  t: Translate;
  nodes: Node[];
}

export const createRelationExplanationHelpers = ({
  t,
  nodes,
}: CreateRelationExplanationHelpersOptions) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const getLineEndpointTypes = (
    line: Line,
    sourceType?: string,
    targetType?: string,
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
    targetType?: string,
  ) => {
    const { fromType, toType } = getLineEndpointTypes(
      line,
      sourceType,
      targetType,
    );
    const fields = new Set<string>();

    const relationKey = asRuleKey(getRelationLineKey(line));

    if (relationKey === "relationLine.avoidanceMeans") {
      if (fromType === RelationType.risk) fields.add("Risk.avoidances");
      if (
        fromType === RelationType.attackTool ||
        toType === RelationType.attackTool
      )
        fields.add("AttackTool.avoidances");
      return [...fields];
    }
    if (relationKey === "relationLine.directCauseRisk") {
      if (fromType === RelationType.attackTool)
        fields.add("AttackTool.directCauseRisks");
      if (fromType === RelationType.threatActor)
        fields.add("ThreatActor.directCauseRisks");
      return [...fields];
    }
    if (relationKey === "relationLine.indirectSupportRisk") {
      if (fromType === RelationType.attackTool)
        fields.add("AttackTool.indirectSupportRisks");
      if (fromType === RelationType.threatActor)
        fields.add("ThreatActor.indirectSupportRisks");
      return [...fields];
    }
    if (relationKey === "relationLine.relatedTerm") {
      if (fromType === RelationType.term && toType === RelationType.risk)
        fields.add("Term.relatedRisks");
      if (fromType === RelationType.term && toType === RelationType.avoidance)
        fields.add("Term.relatedAvoidances");
      if (fromType === RelationType.term && toType === RelationType.attackTool)
        fields.add("Term.relatedAttackTools");
      if (fromType === RelationType.term && toType === RelationType.threatActor)
        fields.add("Term.relatedThreatActors");
      return [...fields];
    }
    if (relationKey === "relationLine.causeRisk") {
      if (fromType === RelationType.attackTool) {
        fields.add("AttackTool.directCauseRisks");
        fields.add("AttackTool.indirectSupportRisks");
      }
      if (fromType === RelationType.threatActor) {
        fields.add("ThreatActor.directCauseRisks");
        fields.add("ThreatActor.indirectSupportRisks");
      }
      return [...fields];
    }

    return relationExplanationRuleByKey.get(relationKey)?.sourceFields ?? [];
  };

  const getRelationEvidenceLevel = (line: Line): RelationEvidenceLevel =>
    relationExplanationRuleByKey.get(asRuleKey(getRelationLineKey(line)))?.evidenceLevel ??
    "review";

  const getRelationPriority = (lineText: string) => {
    for (const rule of relationExplanationRuleByKey.values()) {
      if (lineText === rule.relationKey || lineText === t(rule.relationKey)) {
        return rule.priority;
      }
    }
    return 6;
  };

  const isDirectRelationLine = (lineText: string) => {
    for (const relationKey of directRelationLineKeys) {
      if (lineText === relationKey || lineText === t(relationKey)) return true;
    }
    return false;
  };

  const getRelationExplanationText = (
    line: Line,
    sourceType?: string,
    targetType?: string,
  ) => {
    const { fromType, toType } = getLineEndpointTypes(
      line,
      sourceType,
      targetType,
    );
    const relationKey = asRuleKey(getRelationLineKey(line));
    const prefix = "relationView.relationExplanation";

    if (relationKey === "relationLine.avoidanceMeans") {
      if (fromType === RelationType.risk) return t(`${prefix}.riskAvoidance`);
      if (
        fromType === RelationType.attackTool ||
        toType === RelationType.attackTool
      )
        return t(`${prefix}.toolAvoidance`);
      return t(`${prefix}.avoidance`);
    }
    return t(
      relationExplanationRuleByKey.get(relationKey)?.explanationKey ??
      relationExplanationRuleByKey.get(relationKey)?.explanationKey ??
        `${prefix}.review`,
    );
  };

  const getSemanticRelationExplanation = (
    line: Line,
    sourceType?: string,
    targetType?: string,
  ) => {
    const { fromType, toType } = getLineEndpointTypes(
      line,
      sourceType,
      targetType,
    );
    const params = {
      fromId: line.from,
      fromTitle: getNodeDisplayTitle(line.from),
      toId: line.to,
      toTitle: getNodeDisplayTitle(line.to),
      relation: line.text,
    };
    const relationKey = asRuleKey(getRelationLineKey(line));
    const prefix = "relationView.semanticExplanation";

    if (relationKey === "relationLine.avoidanceMeans") {
      if (fromType === RelationType.risk)
        return t(`${prefix}.riskAvoidance`, params);
      if (
        fromType === RelationType.attackTool ||
        toType === RelationType.attackTool
      )
        return t(`${prefix}.toolAvoidance`, params);
      return t(`${prefix}.avoidance`, params);
    }
    return t(
      relationExplanationRuleByKey.get(relationKey)?.semanticKey ??
        `${prefix}.review`,
      params,
    );
  };

  const getRelationImpactHint = (line: Line) => {
    const prefix = "relationView.relationImpact";

    return t(
      relationExplanationRuleByKey.get(asRuleKey(getRelationLineKey(line)))?.impactKey ??
        `${prefix}.review`,
    );
  };

  const explainRelation = (
    line: Line,
    sourceType?: string,
    targetType?: string,
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
        targetType,
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
