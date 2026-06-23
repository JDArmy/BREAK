import {
  RelationType,
  type AttackPath,
  type AttackPathEntitySummary,
  type AttackPathExplanation,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

type NodeTitleGetter = (type: RelationEntityType, key: string) => string;

interface CreateRelationAttackPathExplanationOptions {
  buildPathGroupKey: (path: AttackPath) => string;
  getNodeTitle: NodeTitleGetter;
  getThreatActorRiskFields: (
    threatActorKey: string,
    riskKey: string,
  ) => string[];
  getThreatActorToolFields: (
    threatActorKey: string,
    attackToolKey: string,
  ) => string[];
  getToolRiskFields: (attackToolKey: string, riskKey: string) => string[];
  t: Translate;
}

const unique = <T>(values: T[]) => [...new Set(values)];

export const createRelationAttackPathExplanation = ({
  buildPathGroupKey,
  getNodeTitle,
  getThreatActorRiskFields,
  getThreatActorToolFields,
  getToolRiskFields,
  t,
}: CreateRelationAttackPathExplanationOptions) => {
  const buildEntitySummary = (
    type: RelationEntityType,
    id: string,
  ): AttackPathEntitySummary => ({
    id,
    title: getNodeTitle(type, id),
    type,
  });

  const explainAttackPath = (
    path: AttackPath,
    groupedPaths: AttackPath[] = [path],
  ): AttackPathExplanation => {
    const steps: AttackPathExplanation["steps"] = [];
    const qualityFlags: string[] = [];
    const defensiveFocus: string[] = [];
    const threatActorIds = unique(
      groupedPaths
        .map((item) => item.threatActorKey)
        .filter(Boolean) as string[],
    );
    const threatActors = threatActorIds.map((id) =>
      buildEntitySummary(RelationType.threatActor, id),
    );
    const attackTool = path.attackToolKey
      ? buildEntitySummary(RelationType.attackTool, path.attackToolKey)
      : undefined;
    const risk = buildEntitySummary(RelationType.risk, path.riskKey);
    const avoidance = path.avoidanceKey
      ? buildEntitySummary(RelationType.avoidance, path.avoidanceKey)
      : undefined;

    if (path.threatActorKey && path.attackToolKey) {
      const sourceFields = unique(
        threatActorIds.flatMap((threatActorKey) =>
          getThreatActorToolFields(
            threatActorKey,
            path.attackToolKey as string,
          ),
        ),
      );
      steps.push({
        fromId:
          threatActorIds.length > 1
            ? t("relationView.groupedThreatActors", {
                count: threatActorIds.length,
              })
            : path.threatActorKey,
        fromTitle:
          threatActorIds.length > 1
            ? t("relationView.groupedThreatActors", {
                count: threatActorIds.length,
              })
            : getNodeTitle(RelationType.threatActor, path.threatActorKey),
        toId: path.attackToolKey,
        toTitle: getNodeTitle(RelationType.attackTool, path.attackToolKey),
        relationType: sourceFields.includes("ThreatActor.buildAttackTools")
          ? t("relationLine.buildAttackTool")
          : t("relationLine.useAttackTool"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.actorToTool"),
        defensiveMeaning: t("relationView.attackPathDefense.actorToTool"),
      });
      if (sourceFields.length === 0)
        qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    }

    if (path.attackToolKey) {
      const sourceFields = getToolRiskFields(path.attackToolKey, path.riskKey);
      steps.push({
        fromId: path.attackToolKey,
        fromTitle: getNodeTitle(RelationType.attackTool, path.attackToolKey),
        toId: path.riskKey,
        toTitle: getNodeTitle(RelationType.risk, path.riskKey),
        relationType: sourceFields.includes("AttackTool.directCauseRisks")
          ? t("relationLine.directCauseRisk")
          : t("relationLine.indirectSupportRisk"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.toolToRisk"),
        defensiveMeaning: t("relationView.attackPathDefense.toolToRisk"),
      });
      if (sourceFields.length === 0)
        qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    } else if (path.threatActorKey) {
      const sourceFields = getThreatActorRiskFields(
        path.threatActorKey,
        path.riskKey,
      );
      steps.push({
        fromId: path.threatActorKey,
        fromTitle: getNodeTitle(RelationType.threatActor, path.threatActorKey),
        toId: path.riskKey,
        toTitle: getNodeTitle(RelationType.risk, path.riskKey),
        relationType: sourceFields.includes("ThreatActor.directCauseRisks")
          ? t("relationLine.directCauseRisk")
          : t("relationLine.indirectSupportRisk"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.actorToRisk"),
        defensiveMeaning: t("relationView.attackPathDefense.actorToRisk"),
      });
      if (sourceFields.length === 0)
        qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    }

    if (path.avoidanceKey) {
      const sourceFields =
        path.avoidanceSourceFields && path.avoidanceSourceFields.length > 0
          ? path.avoidanceSourceFields
          : ["Risk.avoidances"];
      steps.push({
        fromId: path.riskKey,
        fromTitle: getNodeTitle(RelationType.risk, path.riskKey),
        toId: path.avoidanceKey,
        toTitle: getNodeTitle(RelationType.avoidance, path.avoidanceKey),
        relationType: t("relationLine.avoidanceMeans"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.riskToAvoidance"),
        defensiveMeaning: t("relationView.attackPathDefense.riskToAvoidance"),
      });
      defensiveFocus.push(path.avoidanceKey);
    } else {
      qualityFlags.push(t("relationView.qualityFlagMissingAvoidance"));
    }

    return {
      pathKey: buildPathGroupKey(path),
      pathCount: groupedPaths.length,
      threatActors,
      threatActorId: path.threatActorKey,
      attackTool,
      attackToolId: path.attackToolKey,
      risk,
      riskId: path.riskKey,
      avoidance,
      avoidanceId: path.avoidanceKey,
      summary:
        groupedPaths.length > 1
          ? t("relationView.attackPathGroupedExplanationSummary", {
              pathCount: groupedPaths.length,
              actorCount: threatActorIds.length,
              stepCount: steps.length,
              risk: risk.title,
            })
          : t("relationView.attackPathExplanationSummary", {
              count: steps.length,
              risk: risk.title,
            }),
      analysisFinding: attackTool
        ? t("relationView.attackPathFinding.toolRisk", {
            actorCount: threatActorIds.length,
            tool: attackTool.title,
            risk: risk.title,
            relation:
              steps.find((step) => step.toId === path.riskKey)?.relationType ??
              t("relationLine.causeRisk"),
            avoidance:
              avoidance?.title ?? t("relationView.noAvoidanceCoverage"),
          })
        : t("relationView.attackPathFinding.actorRisk", {
            actorCount: threatActorIds.length,
            risk: risk.title,
            avoidance:
              avoidance?.title ?? t("relationView.noAvoidanceCoverage"),
          }),
      recommendedAction: attackTool
        ? t("relationView.attackPathRecommendedAction.toolRisk", {
            tool: attackTool.title,
            risk: risk.title,
            avoidance:
              avoidance?.title ?? t("relationView.noAvoidanceCoverage"),
          })
        : t("relationView.attackPathRecommendedAction.actorRisk", {
            risk: risk.title,
            avoidance:
              avoidance?.title ?? t("relationView.noAvoidanceCoverage"),
          }),
      evidenceFields: unique(steps.flatMap((step) => step.sourceFields)),
      defensiveFocus,
      qualityFlags,
      steps,
    };
  };

  const explainGroupedAttackPaths = (paths: AttackPath[]) => {
    const groupedPaths = new Map<string, AttackPath[]>();

    paths.forEach((path) => {
      const groupKey = buildPathGroupKey(path);
      const existingPaths = groupedPaths.get(groupKey);
      if (existingPaths) {
        existingPaths.push(path);
      } else {
        groupedPaths.set(groupKey, [path]);
      }
    });

    return [...groupedPaths.values()].map((items) =>
      explainAttackPath(items[0], items),
    );
  };

  return {
    explainAttackPath,
    explainGroupedAttackPaths,
  };
};
