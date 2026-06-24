import { computed, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  createRelationCoverageAnalysisHelpers,
  type Translate,
  unique,
} from "@/views/relation/relationCoverageAnalysisHelpers";
import { createRelationNodeCoverageBuilders } from "@/views/relation/relationNodeCoverageBuilders";
import {
  RelationType,
  type Node,
  type NodeCoverageSummary,
  type NodeSpecialInsightSummary,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

interface CreateRelationCoverageAnalysisOptions {
  t: Translate;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  selectedNetworkNode: ComputedRef<Node | null>;
  getNodeTitle: (type: RelationEntityType, key: string) => string;
}

export const createRelationCoverageAnalysis = ({
  t,
  relType,
  relKey,
  selectedNetworkNode,
  getNodeTitle,
}: CreateRelationCoverageAnalysisOptions) => {
  const {
    buildNodeItem,
    buildSection,
    getAvoidancesByRisksAndTools,
    getRisksByAttackTools,
    getThreatActorsByRisks,
  } = createRelationCoverageAnalysisHelpers({ t, getNodeTitle });
  const {
    buildAttackToolCoverage,
    buildAvoidanceCoverage,
    buildRiskCoverage,
    buildThreatActorCoverage,
  } = createRelationNodeCoverageBuilders({ t, getNodeTitle });

  const selectedNodeCoverageSummary = computed<NodeCoverageSummary | null>(
    () => {
      const node = selectedNetworkNode.value;
      if (!node) return null;
      if (node.type === RelationType.risk) return buildRiskCoverage(node.id);
      if (node.type === RelationType.avoidance)
        return buildAvoidanceCoverage(node.id);
      if (node.type === RelationType.attackTool)
        return buildAttackToolCoverage(node.id);
      if (node.type === RelationType.threatActor)
        return buildThreatActorCoverage(node.id);
      return null;
    },
  );

  const avoidanceSpecialInsight = computed<NodeSpecialInsightSummary | null>(
    () => {
      if (relType.value !== RelationType.avoidance) return null;
      const avoidance =
        BREAK.avoidances[relKey.value as keyof typeof BREAK.avoidances];
      if (!avoidance) return null;

      const riskKeys = Object.entries(BREAK.risks)
        .filter(([, risk]) => risk.avoidances.includes(relKey.value))
        .map(([riskKey]) => riskKey);
      const attackToolKeys = Object.entries(BREAK.attackTools)
        .filter(([, attackTool]) =>
          attackTool.avoidances.includes(relKey.value),
        )
        .map(([attackToolKey]) => attackToolKey);
      const threatActorKeys = unique(getThreatActorsByRisks(riskKeys));
      const overlapRiskKeys = riskKeys.filter((riskKey) =>
        attackToolKeys.some((attackToolKey) => {
          const attackTool =
            BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
          return (
            attackTool?.directCauseRisks.includes(riskKey) ||
            attackTool?.indirectSupportRisks.includes(riskKey)
          );
        }),
      );

      const sections = [
        buildSection(
          t("relationView.specialInsight.avoidance.coverageQualityTitle"),
          t("relationView.specialInsight.avoidance.coverageQualitySummary", {
            risks: riskKeys.length,
            tools: attackToolKeys.length,
            overlap: overlapRiskKeys.length,
          }),
          [
            {
              label: t("relationView.nodeCoverageMetricRisk"),
              value: riskKeys.length,
            },
            {
              label: t("relationView.nodeCoverageMetricTool"),
              value: attackToolKeys.length,
            },
            {
              label: t("relationView.nodeCoverageMetricOverlap"),
              value: overlapRiskKeys.length,
            },
          ],
          [
            ...overlapRiskKeys.map((riskKey) =>
              buildNodeItem(
                RelationType.risk,
                riskKey,
                ["Risk.avoidances", "AttackTool.avoidances"],
                t("relationView.specialInsight.metaHighConfidence"),
              ),
            ),
            ...riskKeys
              .filter((riskKey) => !overlapRiskKeys.includes(riskKey))
              .map((riskKey) =>
                buildNodeItem(
                  RelationType.risk,
                  riskKey,
                  ["Risk.avoidances"],
                  t("relationView.specialInsight.metaDirectCoverage"),
                ),
              ),
          ],
          overlapRiskKeys.length === 0
            ? t("relationView.specialInsight.avoidance.noOverlapNotice")
            : undefined,
        ),
        buildSection(
          t("relationView.specialInsight.avoidance.traceabilityTitle"),
          t("relationView.specialInsight.avoidance.traceabilitySummary", {
            actors: threatActorKeys.length,
            tools: attackToolKeys.length,
          }),
          [
            {
              label: t("relationView.nodeCoverageMetricThreatActor"),
              value: threatActorKeys.length,
            },
            {
              label: t("relationView.nodeCoverageMetricTool"),
              value: attackToolKeys.length,
            },
          ],
          [
            ...threatActorKeys.map((threatActorKey) =>
              buildNodeItem(
                RelationType.threatActor,
                threatActorKey,
                [
                  "ThreatActor.directCauseRisks",
                  "ThreatActor.indirectSupportRisks",
                ],
                t("relationView.specialInsight.metaActorTrace"),
              ),
            ),
            ...attackToolKeys.map((attackToolKey) =>
              buildNodeItem(
                RelationType.attackTool,
                attackToolKey,
                ["AttackTool.avoidances"],
                t("relationView.specialInsight.metaToolTrace"),
              ),
            ),
          ],
        ),
      ];

      return {
        title: t("relationView.specialInsight.avoidance.title", {
          title: getNodeTitle(RelationType.avoidance, relKey.value),
        }),
        summary: t("relationView.specialInsight.avoidance.summary", {
          risks: riskKeys.length,
          tools: attackToolKeys.length,
          actors: threatActorKeys.length,
        }),
        severity:
          riskKeys.length === 0 && attackToolKeys.length === 0
            ? "warning"
            : "normal",
        sections,
        recommendation:
          riskKeys.length === 0 && attackToolKeys.length === 0
            ? t("relationView.specialInsight.avoidance.recommendReview")
            : t("relationView.specialInsight.avoidance.recommendUse"),
      };
    },
  );

  const attackToolSpecialInsight = computed<NodeSpecialInsightSummary | null>(
    () => {
      if (relType.value !== RelationType.attackTool) return null;
      const attackTool =
        BREAK.attackTools[relKey.value as keyof typeof BREAK.attackTools];
      if (!attackTool) return null;

      const directRiskKeys = unique(attackTool.directCauseRisks).filter(
        (riskKey) => riskKey in BREAK.risks,
      );
      const indirectRiskKeys = unique(attackTool.indirectSupportRisks).filter(
        (riskKey) => riskKey in BREAK.risks,
      );
      const riskKeys = unique([...directRiskKeys, ...indirectRiskKeys]);
      const avoidanceKeys = unique(attackTool.avoidances).filter(
        (avoidanceKey) => avoidanceKey in BREAK.avoidances,
      );
      const builderThreatActorKeys = Object.entries(BREAK.threatActors)
        .filter(([, threatActor]) =>
          threatActor.buildAttackTools.includes(relKey.value),
        )
        .map(([threatActorKey]) => threatActorKey);
      const userThreatActorKeys = Object.entries(BREAK.threatActors)
        .filter(([, threatActor]) =>
          threatActor.useAttackTools.includes(relKey.value),
        )
        .map(([threatActorKey]) => threatActorKey);
      const uncoveredRiskKeys = riskKeys.filter(
        (riskKey) =>
          (BREAK.risks[riskKey as keyof typeof BREAK.risks]?.avoidances
            .length ?? 0) === 0,
      );

      const sections = [
        buildSection(
          t("relationView.specialInsight.attackTool.attackSurfaceTitle"),
          t("relationView.specialInsight.attackTool.attackSurfaceSummary", {
            direct: directRiskKeys.length,
            indirect: indirectRiskKeys.length,
          }),
          [
            {
              label: t("relationView.specialInsight.metricDirectRisk"),
              value: directRiskKeys.length,
            },
            {
              label: t("relationView.specialInsight.metricIndirectRisk"),
              value: indirectRiskKeys.length,
            },
          ],
          [
            ...directRiskKeys.map((riskKey) =>
              buildNodeItem(
                RelationType.risk,
                riskKey,
                ["AttackTool.directCauseRisks"],
                t("relationView.specialInsight.metaDirectRisk"),
              ),
            ),
            ...indirectRiskKeys.map((riskKey) =>
              buildNodeItem(
                RelationType.risk,
                riskKey,
                ["AttackTool.indirectSupportRisks"],
                t("relationView.specialInsight.metaIndirectRisk"),
              ),
            ),
          ],
        ),
        buildSection(
          t("relationView.specialInsight.attackTool.controlTitle"),
          t("relationView.specialInsight.attackTool.controlSummary", {
            avoidances: avoidanceKeys.length,
            uncovered: uncoveredRiskKeys.length,
          }),
          [
            {
              label: t("relationView.nodeCoverageMetricAvoidance"),
              value: avoidanceKeys.length,
            },
            {
              label: t("relationView.specialInsight.metricUncoveredRisk"),
              value: uncoveredRiskKeys.length,
            },
          ],
          [
            ...avoidanceKeys.map((avoidanceKey) =>
              buildNodeItem(
                RelationType.avoidance,
                avoidanceKey,
                ["AttackTool.avoidances"],
                t("relationView.specialInsight.metaToolControl"),
              ),
            ),
            ...uncoveredRiskKeys.map((riskKey) =>
              buildNodeItem(
                RelationType.risk,
                riskKey,
                ["Risk.avoidances"],
                t("relationView.specialInsight.metaCoverageGap"),
              ),
            ),
          ],
          uncoveredRiskKeys.length > 0
            ? t("relationView.specialInsight.attackTool.gapNotice")
            : undefined,
        ),
        buildSection(
          t("relationView.specialInsight.attackTool.userTitle"),
          t("relationView.specialInsight.attackTool.userSummary", {
            builders: builderThreatActorKeys.length,
            users: userThreatActorKeys.length,
          }),
          [
            {
              label: t("buildAttackTools"),
              value: builderThreatActorKeys.length,
            },
            { label: t("useAttackTools"), value: userThreatActorKeys.length },
          ],
          [
            ...builderThreatActorKeys.map((threatActorKey) =>
              buildNodeItem(
                RelationType.threatActor,
                threatActorKey,
                ["ThreatActor.buildAttackTools"],
                t("relationView.specialInsight.metaToolBuilder"),
              ),
            ),
            ...userThreatActorKeys.map((threatActorKey) =>
              buildNodeItem(
                RelationType.threatActor,
                threatActorKey,
                ["ThreatActor.useAttackTools"],
                t("relationView.specialInsight.metaToolUser"),
              ),
            ),
          ],
        ),
      ];

      return {
        title: t("relationView.specialInsight.attackTool.title", {
          title: getNodeTitle(RelationType.attackTool, relKey.value),
        }),
        summary: t("relationView.specialInsight.attackTool.summary", {
          risks: riskKeys.length,
          avoidances: avoidanceKeys.length,
          actors: unique([...builderThreatActorKeys, ...userThreatActorKeys])
            .length,
        }),
        severity: uncoveredRiskKeys.length > 0 ? "warning" : "normal",
        sections,
        recommendation:
          uncoveredRiskKeys.length > 0
            ? t("relationView.specialInsight.attackTool.recommendGap")
            : t("relationView.specialInsight.attackTool.recommendUse"),
      };
    },
  );

  const threatActorSpecialInsight = computed<NodeSpecialInsightSummary | null>(
    () => {
      if (relType.value !== RelationType.threatActor) return null;
      const threatActor =
        BREAK.threatActors[relKey.value as keyof typeof BREAK.threatActors];
      if (!threatActor) return null;

      const buildToolKeys = unique(threatActor.buildAttackTools).filter(
        (attackToolKey) => attackToolKey in BREAK.attackTools,
      );
      const useToolKeys = unique(threatActor.useAttackTools).filter(
        (attackToolKey) => attackToolKey in BREAK.attackTools,
      );
      const directRiskKeys = unique(threatActor.directCauseRisks).filter(
        (riskKey) => riskKey in BREAK.risks,
      );
      const indirectRiskKeys = unique(threatActor.indirectSupportRisks).filter(
        (riskKey) => riskKey in BREAK.risks,
      );
      const toolRiskKeys = getRisksByAttackTools(
        unique([...buildToolKeys, ...useToolKeys]),
      );
      const riskKeys = unique([
        ...directRiskKeys,
        ...indirectRiskKeys,
        ...toolRiskKeys,
      ]);
      const avoidanceKeys = getAvoidancesByRisksAndTools(
        riskKeys,
        unique([...buildToolKeys, ...useToolKeys]),
      );
      const uncoveredRiskKeys = riskKeys.filter(
        (riskKey) =>
          (BREAK.risks[riskKey as keyof typeof BREAK.risks]?.avoidances
            .length ?? 0) === 0,
      );

      const sections = [
        buildSection(
          t("relationView.specialInsight.threatActor.capabilityTitle"),
          t("relationView.specialInsight.threatActor.capabilitySummary", {
            builders: buildToolKeys.length,
            users: useToolKeys.length,
          }),
          [
            { label: t("buildAttackTools"), value: buildToolKeys.length },
            { label: t("useAttackTools"), value: useToolKeys.length },
          ],
          [
            ...buildToolKeys.map((attackToolKey) =>
              buildNodeItem(
                RelationType.attackTool,
                attackToolKey,
                ["ThreatActor.buildAttackTools"],
                t("relationView.specialInsight.metaToolBuilder"),
              ),
            ),
            ...useToolKeys.map((attackToolKey) =>
              buildNodeItem(
                RelationType.attackTool,
                attackToolKey,
                ["ThreatActor.useAttackTools"],
                t("relationView.specialInsight.metaToolUser"),
              ),
            ),
          ],
        ),
        buildSection(
          t("relationView.specialInsight.threatActor.riskPreferenceTitle"),
          t("relationView.specialInsight.threatActor.riskPreferenceSummary", {
            direct: directRiskKeys.length,
            indirect: indirectRiskKeys.length,
            tool: toolRiskKeys.length,
          }),
          [
            {
              label: t("relationView.specialInsight.metricDirectRisk"),
              value: directRiskKeys.length,
            },
            {
              label: t("relationView.specialInsight.metricIndirectRisk"),
              value: indirectRiskKeys.length,
            },
            {
              label: t("relationView.specialInsight.metricToolRisk"),
              value: toolRiskKeys.length,
            },
          ],
          [
            ...directRiskKeys.map((riskKey) =>
              buildNodeItem(
                RelationType.risk,
                riskKey,
                ["ThreatActor.directCauseRisks"],
                t("relationView.specialInsight.metaDirectRisk"),
              ),
            ),
            ...indirectRiskKeys.map((riskKey) =>
              buildNodeItem(
                RelationType.risk,
                riskKey,
                ["ThreatActor.indirectSupportRisks"],
                t("relationView.specialInsight.metaIndirectRisk"),
              ),
            ),
          ],
        ),
        buildSection(
          t("relationView.specialInsight.threatActor.defensePriorityTitle"),
          t("relationView.specialInsight.threatActor.defensePrioritySummary", {
            avoidances: avoidanceKeys.length,
            gaps: uncoveredRiskKeys.length,
          }),
          [
            {
              label: t("relationView.nodeCoverageMetricAvoidance"),
              value: avoidanceKeys.length,
            },
            {
              label: t("relationView.specialInsight.metricUncoveredRisk"),
              value: uncoveredRiskKeys.length,
            },
          ],
          [
            ...avoidanceKeys.map((avoidanceKey) =>
              buildNodeItem(
                RelationType.avoidance,
                avoidanceKey,
                ["Risk.avoidances", "AttackTool.avoidances"],
                t("relationView.specialInsight.metaDefensePriority"),
              ),
            ),
            ...uncoveredRiskKeys.map((riskKey) =>
              buildNodeItem(
                RelationType.risk,
                riskKey,
                ["Risk.avoidances"],
                t("relationView.specialInsight.metaCoverageGap"),
              ),
            ),
          ],
          uncoveredRiskKeys.length > 0
            ? t("relationView.specialInsight.threatActor.gapNotice")
            : undefined,
        ),
      ];

      return {
        title: t("relationView.specialInsight.threatActor.title", {
          title: getNodeTitle(RelationType.threatActor, relKey.value),
        }),
        summary: t("relationView.specialInsight.threatActor.summary", {
          tools: unique([...buildToolKeys, ...useToolKeys]).length,
          risks: riskKeys.length,
          avoidances: avoidanceKeys.length,
        }),
        severity: uncoveredRiskKeys.length > 0 ? "warning" : "normal",
        sections,
        recommendation:
          uncoveredRiskKeys.length > 0
            ? t("relationView.specialInsight.threatActor.recommendGap")
            : t("relationView.specialInsight.threatActor.recommendUse"),
      };
    },
  );

  const selectedNodeSpecialInsightSummary =
    computed<NodeSpecialInsightSummary | null>(() => {
      const node = selectedNetworkNode.value;
      if (!node) return null;
      if (node.type === RelationType.avoidance)
        return avoidanceSpecialInsight.value;
      if (node.type === RelationType.attackTool)
        return attackToolSpecialInsight.value;
      if (node.type === RelationType.threatActor)
        return threatActorSpecialInsight.value;
      return null;
    });

  return {
    selectedNodeCoverageSummary,
    selectedNodeSpecialInsightSummary,
  };
};
