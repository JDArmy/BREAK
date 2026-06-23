import { computed, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  RelationType,
  type AttackPath,
  type RelationEntityType,
  type RiskAvoidanceCoverage,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

type NodeTitleGetter = (type: RelationEntityType, key: string) => string;

interface CreateRelationAttackPathCoverageOptions {
  allAttackPaths: ComputedRef<AttackPath[]>;
  getNodeTitle: NodeTitleGetter;
  relKey: Ref<string>;
  relType: Ref<RelationType>;
  t: Translate;
}

const unique = <T>(values: T[]) => [...new Set(values)];

const sortByKey = <T extends { key: string }>(items: T[]) =>
  [...items].sort((first, second) =>
    first.key.localeCompare(second.key, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

export const createRelationAttackPathCoverage = ({
  allAttackPaths,
  getNodeTitle,
  relKey,
  relType,
  t,
}: CreateRelationAttackPathCoverageOptions) => {
  const riskAvoidanceCoverage = computed<RiskAvoidanceCoverage | null>(() => {
    if (relType.value !== RelationType.risk) return null;
    const risk = BREAK.risks[relKey.value as keyof typeof BREAK.risks];
    if (!risk) return null;

    const directAvoidances = unique(risk.avoidances);
    const toolAvoidanceMap = new Map<string, string[]>();
    allAttackPaths.value.forEach((path) => {
      if (!path.avoidanceKey || !path.attackToolKey) return;
      const tools = toolAvoidanceMap.get(path.avoidanceKey) ?? [];
      if (!tools.includes(path.attackToolKey)) tools.push(path.attackToolKey);
      toolAvoidanceMap.set(path.avoidanceKey, tools);
    });

    const avoidanceKeys = unique([
      ...directAvoidances,
      ...toolAvoidanceMap.keys(),
    ]);
    if (avoidanceKeys.length === 0) return null;

    const items = sortByKey(
      avoidanceKeys
        .map((avoidanceKey) => {
          const fromRisk = directAvoidances.includes(avoidanceKey);
          const attackToolKeys = toolAvoidanceMap.get(avoidanceKey) ?? [];
          const fromTool = attackToolKeys.length > 0;
          const source =
            fromRisk && fromTool ? "both" : fromRisk ? "risk" : "attackTool";
          return {
            key: avoidanceKey,
            avoidanceKey,
            avoidanceTitle: getNodeTitle(RelationType.avoidance, avoidanceKey),
            source,
            sourceLabel:
              source === "both"
                ? t("relationView.coverageSourceBoth")
                : source === "risk"
                  ? t("relationView.coverageSourceRisk")
                  : t("relationView.coverageSourceAttackTool"),
            pathCount: allAttackPaths.value.filter(
              (path) => path.avoidanceKey === avoidanceKey,
            ).length,
            attackToolLabels: attackToolKeys.map(
              (attackToolKey) =>
                `${getNodeTitle(RelationType.attackTool, attackToolKey)} (${attackToolKey})`,
            ),
            sourceFields: [
              ...(fromRisk ? ["Risk.avoidances"] : []),
              ...(fromTool ? ["AttackTool.avoidances"] : []),
            ],
          };
        })
        .filter((item) => item.pathCount > 0),
    );

    return {
      totalCount: items.length,
      directCount: items.filter((item) => item.source === "risk").length,
      attackToolCount: items.filter((item) => item.source === "attackTool")
        .length,
      overlapCount: items.filter((item) => item.source === "both").length,
      items,
    };
  });

  return {
    riskAvoidanceCoverage,
  };
};
