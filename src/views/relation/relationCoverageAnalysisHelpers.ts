import BREAK from "@/BREAK";
import {
  RelationType,
  type NodeSpecialInsightSection,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

export type Translate = (
  key: string,
  params?: Record<string, unknown>,
) => string;

interface CreateRelationCoverageAnalysisHelpersOptions {
  t: Translate;
  getNodeTitle: (type: RelationEntityType, key: string) => string;
}

export const unique = (values: string[]) => [...new Set(values)];

const effectivenessRank = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

export const createRelationCoverageAnalysisHelpers = ({
  t,
  getNodeTitle,
}: CreateRelationCoverageAnalysisHelpersOptions) => {
  const buildNodeItem = (
    type: RelationEntityType,
    id: string,
    sourceFields: string[],
    meta: string,
  ) => ({
    id,
    title: getNodeTitle(type, id),
    type,
    meta,
    sourceFields,
  });

  const getAvoidanceEffectiveness = (avoidanceKey: string) =>
    BREAK.avoidances[avoidanceKey as keyof typeof BREAK.avoidances]
      ?.effectiveness;

  const getAvoidanceEffectivenessMeta = (avoidanceKey: string) => {
    const effectiveness = getAvoidanceEffectiveness(avoidanceKey);
    return effectiveness
      ? t(`relationView.avoidanceEffectiveness.${effectiveness}`)
      : "";
  };

  const sortAvoidanceItems = <
    T extends { id: string; type: RelationEntityType },
  >(
    items: T[],
  ) =>
    [...items].sort((left, right) => {
      if (
        left.type !== RelationType.avoidance ||
        right.type !== RelationType.avoidance
      )
        return 0;
      const leftEffectiveness = getAvoidanceEffectiveness(left.id);
      const rightEffectiveness = getAvoidanceEffectiveness(right.id);
      const leftRank = leftEffectiveness
        ? effectivenessRank[leftEffectiveness]
        : 99;
      const rightRank = rightEffectiveness
        ? effectivenessRank[rightEffectiveness]
        : 99;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.id.localeCompare(right.id);
    });

  const buildAvoidanceNodeItem = (
    id: string,
    sourceFields: string[],
    meta: string,
  ) => {
    const effectivenessMeta = getAvoidanceEffectivenessMeta(id);
    return buildNodeItem(
      RelationType.avoidance,
      id,
      sourceFields,
      effectivenessMeta ? `${meta} · ${effectivenessMeta}` : meta,
    );
  };

  const buildSection = (
    title: string,
    summary: string,
    metrics: NodeSpecialInsightSection["metrics"],
    items: NodeSpecialInsightSection["items"],
    notice?: string,
  ): NodeSpecialInsightSection => ({
    title,
    summary,
    metrics,
    items,
    notice,
  });

  const getThreatActorsByRisks = (riskKeys: string[]) =>
    Object.entries(BREAK.threatActors)
      .filter(([, threatActor]) =>
        [
          ...threatActor.directCauseRisks,
          ...threatActor.indirectSupportRisks,
        ].some((riskKey) => riskKeys.includes(riskKey)),
      )
      .map(([threatActorKey]) => threatActorKey);

  const getRisksByAttackTools = (attackToolKeys: string[]) =>
    unique(
      attackToolKeys.flatMap((attackToolKey) => {
        const attackTool =
          BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
        if (!attackTool) return [];
        return [
          ...attackTool.directCauseRisks,
          ...attackTool.indirectSupportRisks,
        ];
      }),
    ).filter((riskKey) => riskKey in BREAK.risks);

  const getAvoidancesByRisksAndTools = (
    riskKeys: string[],
    attackToolKeys: string[],
  ) =>
    unique([
      ...riskKeys.flatMap(
        (riskKey) =>
          BREAK.risks[riskKey as keyof typeof BREAK.risks]?.avoidances ?? [],
      ),
      ...attackToolKeys.flatMap(
        (attackToolKey) =>
          BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
            ?.avoidances ?? [],
      ),
    ]).filter((avoidanceKey) => avoidanceKey in BREAK.avoidances);

  return {
    buildAvoidanceNodeItem,
    buildNodeItem,
    buildSection,
    getAvoidancesByRisksAndTools,
    getRisksByAttackTools,
    getThreatActorsByRisks,
    sortAvoidanceItems,
  };
};
