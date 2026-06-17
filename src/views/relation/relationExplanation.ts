import type { Line, RelationExplanation } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationExplanationHelpersOptions {
  t: Translate;
  getRelationSourceFields: (line: Line) => string[];
}

const evidenceLevelKeys = {
  direct: true,
  indirect: true,
  inferred: true,
  review: true,
} as const;

const sourceFieldEvidence = (fields: string[]) => {
  if (fields.some((field) => field.endsWith(".directCauseRisks") || field === "ThreatActor.buildAttackTools")) {
    return "direct";
  }
  if (fields.some((field) => field.endsWith(".indirectSupportRisks") || field === "ThreatActor.useAttackTools")) {
    return "indirect";
  }
  if (fields.some((field) => field.endsWith(".avoidances") || field.startsWith("Term."))) {
    return "direct";
  }
  if (fields.some((field) => field.includes(" child ID"))) {
    return "inferred";
  }
  return "review";
};

export const createRelationExplanationHelpers = ({
  t,
  getRelationSourceFields,
}: CreateRelationExplanationHelpersOptions) => {
  const formatEvidenceLevel = (level: string) =>
    t(`relationView.evidenceLevel.${level in evidenceLevelKeys ? level : "review"}`);

  const getExplanationKey = (line: Line, fields: string[]) => {
    if (fields.includes("Risk.avoidances")) return "riskAvoidance";
    if (fields.includes("AttackTool.avoidances")) return "toolAvoidance";
    if (line.text === t("relationLine.avoidanceMeans")) return "avoidance";
    if (fields.some((field) => field.endsWith(".directCauseRisks"))) return "directCauseRisk";
    if (fields.some((field) => field.endsWith(".indirectSupportRisks"))) return "indirectSupportRisk";
    if (fields.includes("ThreatActor.buildAttackTools")) return "buildAttackTool";
    if (fields.includes("ThreatActor.useAttackTools")) return "useAttackTool";
    if (line.text === t("relationLine.causeRisk")) return "causeRisk";
    if (fields.some((field) => field.startsWith("Term."))) return "relatedTerm";
    if (fields.some((field) => field.includes(" child ID"))) return "subEntity";
    if (line.text === t("relationLine.attackToolMaker")) return "attackToolMaker";
    return "review";
  };

  const getImpactKey = (line: Line, fields: string[]) => {
    if (line.text === t("relationLine.avoidanceMeans") || fields.some((field) => field.endsWith(".avoidances"))) {
      return "avoidance";
    }
    if (fields.some((field) => field.endsWith(".directCauseRisks"))) return "directCauseRisk";
    if (fields.some((field) => field.endsWith(".indirectSupportRisks"))) return "indirectSupportRisk";
    if (fields.some((field) => field === "ThreatActor.buildAttackTools" || field === "ThreatActor.useAttackTools")) {
      return "threatActorTool";
    }
    if (line.text === t("relationLine.causeRisk")) return "causeRisk";
    if (fields.some((field) => field.startsWith("Term."))) return "relatedTerm";
    if (fields.some((field) => field.includes(" child ID"))) return "subEntity";
    return "review";
  };

  const explainRelation = (line: Line): RelationExplanation => {
    const fields = getRelationSourceFields(line);
    const qualityFlags: string[] = [];
    const evidenceLevel = sourceFieldEvidence(fields);

    if (!fields.length) qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    if (evidenceLevel === "review") qualityFlags.push(t("relationView.qualityFlagReview"));

    return {
      evidenceLevel,
      explanation: t(`relationView.relationExplanation.${getExplanationKey(line, fields)}`),
      impactHint: t(`relationView.relationImpact.${getImpactKey(line, fields)}`),
      qualityFlags,
    };
  };

  return {
    explainRelation,
    formatEvidenceLevel,
  };
};
