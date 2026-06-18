import { computed, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  RelationType,
  type Node,
  type NodeCoverageSummary,
  type NodeSpecialInsightSection,
  type NodeSpecialInsightSummary,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationCoverageAnalysisOptions {
  t: Translate;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  selectedNetworkNode: ComputedRef<Node | null>;
  getNodeTitle: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
}

const unique = (values: string[]) => [...new Set(values)];

export const createRelationCoverageAnalysis = ({
  t,
  relType,
  relKey,
  selectedNetworkNode,
  getNodeTitle,
}: CreateRelationCoverageAnalysisOptions) => {
  const buildNodeItem = (
    type: Exclude<RelationType, RelationType.all>,
    id: string,
    sourceFields: string[],
    meta: string
  ) => ({
    id,
    title: getNodeTitle(type, id),
    type,
    meta,
    sourceFields,
  });

  const buildSection = (
    title: string,
    summary: string,
    metrics: NodeSpecialInsightSection["metrics"],
    items: NodeSpecialInsightSection["items"],
    notice?: string
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
        [...threatActor.directCauseRisks, ...threatActor.indirectSupportRisks].some((riskKey) =>
          riskKeys.includes(riskKey)
        )
      )
      .map(([threatActorKey]) => threatActorKey);

  const getRisksByAttackTools = (attackToolKeys: string[]) =>
    unique(
      attackToolKeys.flatMap((attackToolKey) => {
        const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
        if (!attackTool) return [];
        return [...attackTool.directCauseRisks, ...attackTool.indirectSupportRisks];
      })
    ).filter((riskKey) => riskKey in BREAK.risks);

  const getAvoidancesByRisksAndTools = (riskKeys: string[], attackToolKeys: string[]) =>
    unique([
      ...riskKeys.flatMap((riskKey) => BREAK.risks[riskKey as keyof typeof BREAK.risks]?.avoidances ?? []),
      ...attackToolKeys.flatMap(
        (attackToolKey) =>
          BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]?.avoidances ?? []
      ),
    ]).filter((avoidanceKey) => avoidanceKey in BREAK.avoidances);

  const riskCoverage = computed<NodeCoverageSummary | null>(() => {
    if (relType.value !== RelationType.risk) return null;
    const risk = BREAK.risks[relKey.value as keyof typeof BREAK.risks];
    if (!risk) return null;

    const directAvoidances = unique(risk.avoidances);
    const attackToolKeys = Object.entries(BREAK.attackTools)
      .filter(([, attackTool]) =>
        attackTool.directCauseRisks.includes(relKey.value) ||
        attackTool.indirectSupportRisks.includes(relKey.value)
      )
      .map(([attackToolKey]) => attackToolKey);

    const attackToolAvoidances = unique(
      attackToolKeys.flatMap((attackToolKey) =>
        BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools].avoidances
      )
    );

    const directItems = directAvoidances
      .filter((avoidanceKey) => avoidanceKey in BREAK.avoidances)
      .map((avoidanceKey) =>
        buildNodeItem(
          RelationType.avoidance,
          avoidanceKey,
          ["Risk.avoidances"],
          t("relationView.nodeCoverageMetaDirect")
        )
      );

    const toolItems = attackToolAvoidances
      .filter((avoidanceKey) => avoidanceKey in BREAK.avoidances && !directAvoidances.includes(avoidanceKey))
      .map((avoidanceKey) =>
        buildNodeItem(
          RelationType.avoidance,
          avoidanceKey,
          ["AttackTool.avoidances"],
          t("relationView.nodeCoverageMetaTool")
        )
      );

    const overlapItems = attackToolAvoidances
      .filter((avoidanceKey) => directAvoidances.includes(avoidanceKey))
      .map((avoidanceKey) =>
        buildNodeItem(
          RelationType.avoidance,
          avoidanceKey,
          ["Risk.avoidances", "AttackTool.avoidances"],
          t("relationView.nodeCoverageMetaBoth")
        )
      );

    const items = [...overlapItems, ...directItems, ...toolItems];
    const severity =
      items.length === 0
        ? "danger"
        : attackToolAvoidances.length > 0 && directAvoidances.length === 0
          ? "warning"
          : "normal";

    return {
      title: t("relationView.nodeCoverageTitle.risk", { title: getNodeTitle(RelationType.risk, relKey.value) }),
      summary: t("relationView.nodeCoverageSummary.risk", {
        direct: directItems.length,
        tool: toolItems.length,
        overlap: overlapItems.length,
        total: items.length,
      }),
      severity,
      metrics: [
        { label: t("relationView.nodeCoverageMetricDirect"), value: directItems.length },
        { label: t("relationView.nodeCoverageMetricTool"), value: toolItems.length },
        { label: t("relationView.nodeCoverageMetricOverlap"), value: overlapItems.length },
      ],
      items,
      notice: items.length === 0 ? t("relationView.nodeCoverageNotice.risk") : undefined,
    };
  });

  const avoidanceCoverage = computed<NodeCoverageSummary | null>(() => {
    if (relType.value !== RelationType.avoidance) return null;
    const avoidance = BREAK.avoidances[relKey.value as keyof typeof BREAK.avoidances];
    if (!avoidance) return null;

    const riskKeys = Object.entries(BREAK.risks)
      .filter(([, risk]) => risk.avoidances.includes(relKey.value))
      .map(([riskKey]) => riskKey);
    const attackToolKeys = Object.entries(BREAK.attackTools)
      .filter(([, attackTool]) => attackTool.avoidances.includes(relKey.value))
      .map(([attackToolKey]) => attackToolKey);
    const threatActorKeys = Object.entries(BREAK.threatActors)
      .filter(([, threatActor]) =>
        [...threatActor.directCauseRisks, ...threatActor.indirectSupportRisks].some((riskKey) =>
          riskKeys.includes(riskKey)
        )
      )
      .map(([threatActorKey]) => threatActorKey);

    const items = [
      ...riskKeys.map((riskKey) =>
        buildNodeItem(RelationType.risk, riskKey, ["Risk.avoidances"], t("relationView.nodeCoverageMetaRisk"))
      ),
      ...attackToolKeys.map((attackToolKey) =>
        buildNodeItem(RelationType.attackTool, attackToolKey, ["AttackTool.avoidances"], t("relationView.nodeCoverageMetaTool"))
      ),
      ...threatActorKeys.map((threatActorKey) =>
        buildNodeItem(
          RelationType.threatActor,
          threatActorKey,
          ["ThreatActor.directCauseRisks", "ThreatActor.indirectSupportRisks"],
          t("relationView.nodeCoverageMetaThreatActor")
        )
      ),
    ];

    return {
      title: t("relationView.nodeCoverageTitle.avoidance", { title: getNodeTitle(RelationType.avoidance, relKey.value) }),
      summary: t("relationView.nodeCoverageSummary.avoidance", {
        risks: riskKeys.length,
        tools: attackToolKeys.length,
        actors: threatActorKeys.length,
      }),
      severity: items.length === 0 ? "warning" : "normal",
      metrics: [
        { label: t("relationView.nodeCoverageMetricRisk"), value: riskKeys.length },
        { label: t("relationView.nodeCoverageMetricTool"), value: attackToolKeys.length },
        { label: t("relationView.nodeCoverageMetricThreatActor"), value: threatActorKeys.length },
      ],
      items,
      notice: items.length === 0 ? t("relationView.nodeCoverageNotice.avoidance") : undefined,
    };
  });

  const attackToolCoverage = computed<NodeCoverageSummary | null>(() => {
    if (relType.value !== RelationType.attackTool) return null;
    const attackTool = BREAK.attackTools[relKey.value as keyof typeof BREAK.attackTools];
    if (!attackTool) return null;

    const risks = unique([...attackTool.directCauseRisks, ...attackTool.indirectSupportRisks]).filter(
      (riskKey) => riskKey in BREAK.risks
    );
    const avoidances = unique(attackTool.avoidances).filter((avoidanceKey) => avoidanceKey in BREAK.avoidances);

    return {
      title: t("relationView.nodeCoverageTitle.attackTool", {
        title: getNodeTitle(RelationType.attackTool, relKey.value),
      }),
      summary: t("relationView.nodeCoverageSummary.attackTool", {
        risks: risks.length,
        avoidances: avoidances.length,
      }),
      severity: risks.length === 0 ? "warning" : "normal",
      metrics: [
        { label: t("relationView.nodeCoverageMetricRisk"), value: risks.length },
        { label: t("relationView.nodeCoverageMetricAvoidance"), value: avoidances.length },
      ],
      items: [
        ...risks.map((riskKey) =>
          buildNodeItem(
            RelationType.risk,
            riskKey,
            ["AttackTool.directCauseRisks", "AttackTool.indirectSupportRisks"],
            t("relationView.nodeCoverageMetaRisk")
          )
        ),
        ...avoidances.map((avoidanceKey) =>
          buildNodeItem(RelationType.avoidance, avoidanceKey, ["AttackTool.avoidances"], t("relationView.nodeCoverageMetaTool"))
        ),
      ],
      notice: risks.length === 0 ? t("relationView.nodeCoverageNotice.attackTool") : undefined,
    };
  });

  const threatActorCoverage = computed<NodeCoverageSummary | null>(() => {
    if (relType.value !== RelationType.threatActor) return null;
    const threatActor = BREAK.threatActors[relKey.value as keyof typeof BREAK.threatActors];
    if (!threatActor) return null;

    const toolKeys = unique([...threatActor.buildAttackTools, ...threatActor.useAttackTools]).filter(
      (attackToolKey) => attackToolKey in BREAK.attackTools
    );
    const riskKeys = unique([...threatActor.directCauseRisks, ...threatActor.indirectSupportRisks]).filter(
      (riskKey) => riskKey in BREAK.risks
    );

    return {
      title: t("relationView.nodeCoverageTitle.threatActor", {
        title: getNodeTitle(RelationType.threatActor, relKey.value),
      }),
      summary: t("relationView.nodeCoverageSummary.threatActor", {
        tools: toolKeys.length,
        risks: riskKeys.length,
      }),
      severity: toolKeys.length === 0 && riskKeys.length === 0 ? "warning" : "normal",
      metrics: [
        { label: t("relationView.nodeCoverageMetricTool"), value: toolKeys.length },
        { label: t("relationView.nodeCoverageMetricRisk"), value: riskKeys.length },
      ],
      items: [
        ...toolKeys.map((attackToolKey) =>
          buildNodeItem(RelationType.attackTool, attackToolKey, ["ThreatActor.buildAttackTools", "ThreatActor.useAttackTools"], t("relationView.nodeCoverageMetaTool"))
        ),
        ...riskKeys.map((riskKey) =>
          buildNodeItem(
            RelationType.risk,
            riskKey,
            ["ThreatActor.directCauseRisks", "ThreatActor.indirectSupportRisks"],
            t("relationView.nodeCoverageMetaRisk")
          )
        ),
      ],
      notice: toolKeys.length === 0 && riskKeys.length === 0 ? t("relationView.nodeCoverageNotice.threatActor") : undefined,
    };
  });

  const selectedNodeCoverageSummary = computed<NodeCoverageSummary | null>(() => {
    const node = selectedNetworkNode.value;
    if (!node) return null;
    if (node.type === RelationType.risk) return riskCoverage.value;
    if (node.type === RelationType.avoidance) return avoidanceCoverage.value;
    if (node.type === RelationType.attackTool) return attackToolCoverage.value;
    if (node.type === RelationType.threatActor) return threatActorCoverage.value;
    return null;
  });

  const avoidanceSpecialInsight = computed<NodeSpecialInsightSummary | null>(() => {
    if (relType.value !== RelationType.avoidance) return null;
    const avoidance = BREAK.avoidances[relKey.value as keyof typeof BREAK.avoidances];
    if (!avoidance) return null;

    const riskKeys = Object.entries(BREAK.risks)
      .filter(([, risk]) => risk.avoidances.includes(relKey.value))
      .map(([riskKey]) => riskKey);
    const attackToolKeys = Object.entries(BREAK.attackTools)
      .filter(([, attackTool]) => attackTool.avoidances.includes(relKey.value))
      .map(([attackToolKey]) => attackToolKey);
    const threatActorKeys = unique(getThreatActorsByRisks(riskKeys));
    const overlapRiskKeys = riskKeys.filter((riskKey) =>
      attackToolKeys.some((attackToolKey) => {
        const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
        return (
          attackTool?.directCauseRisks.includes(riskKey) ||
          attackTool?.indirectSupportRisks.includes(riskKey)
        );
      })
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
          { label: t("relationView.nodeCoverageMetricRisk"), value: riskKeys.length },
          { label: t("relationView.nodeCoverageMetricTool"), value: attackToolKeys.length },
          { label: t("relationView.nodeCoverageMetricOverlap"), value: overlapRiskKeys.length },
        ],
        [
          ...overlapRiskKeys.map((riskKey) =>
            buildNodeItem(
              RelationType.risk,
              riskKey,
              ["Risk.avoidances", "AttackTool.avoidances"],
              t("relationView.specialInsight.metaHighConfidence")
            )
          ),
          ...riskKeys
            .filter((riskKey) => !overlapRiskKeys.includes(riskKey))
            .map((riskKey) =>
              buildNodeItem(
                RelationType.risk,
                riskKey,
                ["Risk.avoidances"],
                t("relationView.specialInsight.metaDirectCoverage")
              )
            ),
        ],
        overlapRiskKeys.length === 0
          ? t("relationView.specialInsight.avoidance.noOverlapNotice")
          : undefined
      ),
      buildSection(
        t("relationView.specialInsight.avoidance.traceabilityTitle"),
        t("relationView.specialInsight.avoidance.traceabilitySummary", {
          actors: threatActorKeys.length,
          tools: attackToolKeys.length,
        }),
        [
          { label: t("relationView.nodeCoverageMetricThreatActor"), value: threatActorKeys.length },
          { label: t("relationView.nodeCoverageMetricTool"), value: attackToolKeys.length },
        ],
        [
          ...threatActorKeys.map((threatActorKey) =>
            buildNodeItem(
              RelationType.threatActor,
              threatActorKey,
              ["ThreatActor.directCauseRisks", "ThreatActor.indirectSupportRisks"],
              t("relationView.specialInsight.metaActorTrace")
            )
          ),
          ...attackToolKeys.map((attackToolKey) =>
            buildNodeItem(
              RelationType.attackTool,
              attackToolKey,
              ["AttackTool.avoidances"],
              t("relationView.specialInsight.metaToolTrace")
            )
          ),
        ]
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
      severity: riskKeys.length === 0 && attackToolKeys.length === 0 ? "warning" : "normal",
      sections,
      recommendation:
        riskKeys.length === 0 && attackToolKeys.length === 0
          ? t("relationView.specialInsight.avoidance.recommendReview")
          : t("relationView.specialInsight.avoidance.recommendUse"),
    };
  });

  const attackToolSpecialInsight = computed<NodeSpecialInsightSummary | null>(() => {
    if (relType.value !== RelationType.attackTool) return null;
    const attackTool = BREAK.attackTools[relKey.value as keyof typeof BREAK.attackTools];
    if (!attackTool) return null;

    const directRiskKeys = unique(attackTool.directCauseRisks).filter((riskKey) => riskKey in BREAK.risks);
    const indirectRiskKeys = unique(attackTool.indirectSupportRisks).filter((riskKey) => riskKey in BREAK.risks);
    const riskKeys = unique([...directRiskKeys, ...indirectRiskKeys]);
    const avoidanceKeys = unique(attackTool.avoidances).filter((avoidanceKey) => avoidanceKey in BREAK.avoidances);
    const builderThreatActorKeys = Object.entries(BREAK.threatActors)
      .filter(([, threatActor]) => threatActor.buildAttackTools.includes(relKey.value))
      .map(([threatActorKey]) => threatActorKey);
    const userThreatActorKeys = Object.entries(BREAK.threatActors)
      .filter(([, threatActor]) => threatActor.useAttackTools.includes(relKey.value))
      .map(([threatActorKey]) => threatActorKey);
    const uncoveredRiskKeys = riskKeys.filter(
      (riskKey) => (BREAK.risks[riskKey as keyof typeof BREAK.risks]?.avoidances.length ?? 0) === 0
    );

    const sections = [
      buildSection(
        t("relationView.specialInsight.attackTool.attackSurfaceTitle"),
        t("relationView.specialInsight.attackTool.attackSurfaceSummary", {
          direct: directRiskKeys.length,
          indirect: indirectRiskKeys.length,
        }),
        [
          { label: t("relationView.specialInsight.metricDirectRisk"), value: directRiskKeys.length },
          { label: t("relationView.specialInsight.metricIndirectRisk"), value: indirectRiskKeys.length },
        ],
        [
          ...directRiskKeys.map((riskKey) =>
            buildNodeItem(
              RelationType.risk,
              riskKey,
              ["AttackTool.directCauseRisks"],
              t("relationView.specialInsight.metaDirectRisk")
            )
          ),
          ...indirectRiskKeys.map((riskKey) =>
            buildNodeItem(
              RelationType.risk,
              riskKey,
              ["AttackTool.indirectSupportRisks"],
              t("relationView.specialInsight.metaIndirectRisk")
            )
          ),
        ]
      ),
      buildSection(
        t("relationView.specialInsight.attackTool.controlTitle"),
        t("relationView.specialInsight.attackTool.controlSummary", {
          avoidances: avoidanceKeys.length,
          uncovered: uncoveredRiskKeys.length,
        }),
        [
          { label: t("relationView.nodeCoverageMetricAvoidance"), value: avoidanceKeys.length },
          { label: t("relationView.specialInsight.metricUncoveredRisk"), value: uncoveredRiskKeys.length },
        ],
        [
          ...avoidanceKeys.map((avoidanceKey) =>
            buildNodeItem(
              RelationType.avoidance,
              avoidanceKey,
              ["AttackTool.avoidances"],
              t("relationView.specialInsight.metaToolControl")
            )
          ),
          ...uncoveredRiskKeys.map((riskKey) =>
            buildNodeItem(
              RelationType.risk,
              riskKey,
              ["Risk.avoidances"],
              t("relationView.specialInsight.metaCoverageGap")
            )
          ),
        ],
        uncoveredRiskKeys.length > 0
          ? t("relationView.specialInsight.attackTool.gapNotice")
          : undefined
      ),
      buildSection(
        t("relationView.specialInsight.attackTool.userTitle"),
        t("relationView.specialInsight.attackTool.userSummary", {
          builders: builderThreatActorKeys.length,
          users: userThreatActorKeys.length,
        }),
        [
          { label: t("buildAttackTools"), value: builderThreatActorKeys.length },
          { label: t("useAttackTools"), value: userThreatActorKeys.length },
        ],
        [
          ...builderThreatActorKeys.map((threatActorKey) =>
            buildNodeItem(
              RelationType.threatActor,
              threatActorKey,
              ["ThreatActor.buildAttackTools"],
              t("relationView.specialInsight.metaToolBuilder")
            )
          ),
          ...userThreatActorKeys.map((threatActorKey) =>
            buildNodeItem(
              RelationType.threatActor,
              threatActorKey,
              ["ThreatActor.useAttackTools"],
              t("relationView.specialInsight.metaToolUser")
            )
          ),
        ]
      ),
    ];

    return {
      title: t("relationView.specialInsight.attackTool.title", {
        title: getNodeTitle(RelationType.attackTool, relKey.value),
      }),
      summary: t("relationView.specialInsight.attackTool.summary", {
        risks: riskKeys.length,
        avoidances: avoidanceKeys.length,
        actors: unique([...builderThreatActorKeys, ...userThreatActorKeys]).length,
      }),
      severity: uncoveredRiskKeys.length > 0 ? "warning" : "normal",
      sections,
      recommendation:
        uncoveredRiskKeys.length > 0
          ? t("relationView.specialInsight.attackTool.recommendGap")
          : t("relationView.specialInsight.attackTool.recommendUse"),
    };
  });

  const threatActorSpecialInsight = computed<NodeSpecialInsightSummary | null>(() => {
    if (relType.value !== RelationType.threatActor) return null;
    const threatActor = BREAK.threatActors[relKey.value as keyof typeof BREAK.threatActors];
    if (!threatActor) return null;

    const buildToolKeys = unique(threatActor.buildAttackTools).filter(
      (attackToolKey) => attackToolKey in BREAK.attackTools
    );
    const useToolKeys = unique(threatActor.useAttackTools).filter(
      (attackToolKey) => attackToolKey in BREAK.attackTools
    );
    const directRiskKeys = unique(threatActor.directCauseRisks).filter((riskKey) => riskKey in BREAK.risks);
    const indirectRiskKeys = unique(threatActor.indirectSupportRisks).filter((riskKey) => riskKey in BREAK.risks);
    const toolRiskKeys = getRisksByAttackTools(unique([...buildToolKeys, ...useToolKeys]));
    const riskKeys = unique([...directRiskKeys, ...indirectRiskKeys, ...toolRiskKeys]);
    const avoidanceKeys = getAvoidancesByRisksAndTools(riskKeys, unique([...buildToolKeys, ...useToolKeys]));
    const uncoveredRiskKeys = riskKeys.filter(
      (riskKey) => (BREAK.risks[riskKey as keyof typeof BREAK.risks]?.avoidances.length ?? 0) === 0
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
              t("relationView.specialInsight.metaToolBuilder")
            )
          ),
          ...useToolKeys.map((attackToolKey) =>
            buildNodeItem(
              RelationType.attackTool,
              attackToolKey,
              ["ThreatActor.useAttackTools"],
              t("relationView.specialInsight.metaToolUser")
            )
          ),
        ]
      ),
      buildSection(
        t("relationView.specialInsight.threatActor.riskPreferenceTitle"),
        t("relationView.specialInsight.threatActor.riskPreferenceSummary", {
          direct: directRiskKeys.length,
          indirect: indirectRiskKeys.length,
          tool: toolRiskKeys.length,
        }),
        [
          { label: t("relationView.specialInsight.metricDirectRisk"), value: directRiskKeys.length },
          { label: t("relationView.specialInsight.metricIndirectRisk"), value: indirectRiskKeys.length },
          { label: t("relationView.specialInsight.metricToolRisk"), value: toolRiskKeys.length },
        ],
        [
          ...directRiskKeys.map((riskKey) =>
            buildNodeItem(
              RelationType.risk,
              riskKey,
              ["ThreatActor.directCauseRisks"],
              t("relationView.specialInsight.metaDirectRisk")
            )
          ),
          ...indirectRiskKeys.map((riskKey) =>
            buildNodeItem(
              RelationType.risk,
              riskKey,
              ["ThreatActor.indirectSupportRisks"],
              t("relationView.specialInsight.metaIndirectRisk")
            )
          ),
        ]
      ),
      buildSection(
        t("relationView.specialInsight.threatActor.defensePriorityTitle"),
        t("relationView.specialInsight.threatActor.defensePrioritySummary", {
          avoidances: avoidanceKeys.length,
          gaps: uncoveredRiskKeys.length,
        }),
        [
          { label: t("relationView.nodeCoverageMetricAvoidance"), value: avoidanceKeys.length },
          { label: t("relationView.specialInsight.metricUncoveredRisk"), value: uncoveredRiskKeys.length },
        ],
        [
          ...avoidanceKeys.map((avoidanceKey) =>
            buildNodeItem(
              RelationType.avoidance,
              avoidanceKey,
              ["Risk.avoidances", "AttackTool.avoidances"],
              t("relationView.specialInsight.metaDefensePriority")
            )
          ),
          ...uncoveredRiskKeys.map((riskKey) =>
            buildNodeItem(
              RelationType.risk,
              riskKey,
              ["Risk.avoidances"],
              t("relationView.specialInsight.metaCoverageGap")
            )
          ),
        ],
        uncoveredRiskKeys.length > 0
          ? t("relationView.specialInsight.threatActor.gapNotice")
          : undefined
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
  });

  const selectedNodeSpecialInsightSummary = computed<NodeSpecialInsightSummary | null>(() => {
    const node = selectedNetworkNode.value;
    if (!node) return null;
    if (node.type === RelationType.avoidance) return avoidanceSpecialInsight.value;
    if (node.type === RelationType.attackTool) return attackToolSpecialInsight.value;
    if (node.type === RelationType.threatActor) return threatActorSpecialInsight.value;
    return null;
  });

  return {
    selectedNodeCoverageSummary,
    selectedNodeSpecialInsightSummary,
  };
};
