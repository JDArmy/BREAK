import BREAK from "@/BREAK";
import {
  createRelationCoverageAnalysisHelpers,
  unique,
} from "@/views/relation/relationCoverageAnalysisHelpers";
import type { Translate } from "@/views/relation/relationCoverageAnalysisHelpers";
import {
  RelationType,
  type NodeCoverageSummary,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

interface CreateRelationNodeCoverageBuildersOptions {
  t: Translate;
  getNodeTitle: (type: RelationEntityType, key: string) => string;
}

export const createRelationNodeCoverageBuilders = ({
  t,
  getNodeTitle,
}: CreateRelationNodeCoverageBuildersOptions) => {
  const {
    buildAvoidanceNodeItem,
    buildNodeItem,
    sortAvoidanceItems,
  } = createRelationCoverageAnalysisHelpers({ t, getNodeTitle });

  const buildRiskCoverage = (riskKey: string): NodeCoverageSummary | null => {
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    if (!risk) return null;

    const directAvoidances = unique(risk.avoidances);
    const attackToolKeys = Object.entries(BREAK.attackTools)
      .filter(
        ([, attackTool]) =>
          attackTool.directCauseRisks.includes(riskKey) ||
          attackTool.indirectSupportRisks.includes(riskKey),
      )
      .map(([attackToolKey]) => attackToolKey);

    const attackToolAvoidances = unique(
      attackToolKeys.flatMap(
        (attackToolKey) =>
          BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
            .avoidances,
      ),
    );

    const directItems = directAvoidances
      .filter((avoidanceKey) => avoidanceKey in BREAK.avoidances)
      .map((avoidanceKey) =>
        buildAvoidanceNodeItem(
          avoidanceKey,
          ["Risk.avoidances"],
          t("relationView.nodeCoverageMetaDirect"),
        ),
      );

    const toolItems = attackToolAvoidances
      .filter(
        (avoidanceKey) =>
          avoidanceKey in BREAK.avoidances &&
          !directAvoidances.includes(avoidanceKey),
      )
      .map((avoidanceKey) =>
        buildAvoidanceNodeItem(
          avoidanceKey,
          ["AttackTool.avoidances"],
          t("relationView.nodeCoverageMetaTool"),
        ),
      );

    const overlapItems = attackToolAvoidances
      .filter((avoidanceKey) => directAvoidances.includes(avoidanceKey))
      .map((avoidanceKey) =>
        buildAvoidanceNodeItem(
          avoidanceKey,
          ["Risk.avoidances", "AttackTool.avoidances"],
          t("relationView.nodeCoverageMetaBoth"),
        ),
      );

    const items = sortAvoidanceItems([
      ...overlapItems,
      ...directItems,
      ...toolItems,
    ]);
    const severity =
      items.length === 0
        ? "danger"
        : attackToolAvoidances.length > 0 && directAvoidances.length === 0
          ? "warning"
          : "normal";

    return {
      title: t("relationView.nodeCoverageTitle.risk", {
        title: getNodeTitle(RelationType.risk, riskKey),
      }),
      summary: t("relationView.nodeCoverageSummary.risk", {
        direct: directItems.length,
        tool: toolItems.length,
        overlap: overlapItems.length,
        total: items.length,
      }),
      severity,
      metrics: [
        {
          label: t("relationView.nodeCoverageMetricDirect"),
          value: directItems.length,
        },
        {
          label: t("relationView.nodeCoverageMetricTool"),
          value: toolItems.length,
        },
        {
          label: t("relationView.nodeCoverageMetricOverlap"),
          value: overlapItems.length,
        },
      ],
      items,
      notice:
        items.length === 0
          ? t("relationView.nodeCoverageNotice.risk")
          : undefined,
    };
  };

  const buildAvoidanceCoverage = (
    avoidanceKey: string,
  ): NodeCoverageSummary | null => {
    const avoidance =
      BREAK.avoidances[avoidanceKey as keyof typeof BREAK.avoidances];
    if (!avoidance) return null;

    const riskKeys = Object.entries(BREAK.risks)
      .filter(([, risk]) => risk.avoidances.includes(avoidanceKey))
      .map(([riskKey]) => riskKey);
    const attackToolKeys = Object.entries(BREAK.attackTools)
      .filter(([, attackTool]) => attackTool.avoidances.includes(avoidanceKey))
      .map(([attackToolKey]) => attackToolKey);
    const threatActorKeys = Object.entries(BREAK.threatActors)
      .filter(([, threatActor]) =>
        [
          ...threatActor.directCauseRisks,
          ...threatActor.indirectSupportRisks,
        ].some((riskKey) => riskKeys.includes(riskKey)),
      )
      .map(([threatActorKey]) => threatActorKey);

    const items = [
      ...riskKeys.map((riskKey) =>
        buildNodeItem(
          RelationType.risk,
          riskKey,
          ["Risk.avoidances"],
          t("relationView.nodeCoverageMetaRisk"),
        ),
      ),
      ...attackToolKeys.map((attackToolKey) =>
        buildNodeItem(
          RelationType.attackTool,
          attackToolKey,
          ["AttackTool.avoidances"],
          t("relationView.nodeCoverageMetaTool"),
        ),
      ),
      ...threatActorKeys.map((threatActorKey) =>
        buildNodeItem(
          RelationType.threatActor,
          threatActorKey,
          ["ThreatActor.directCauseRisks", "ThreatActor.indirectSupportRisks"],
          t("relationView.nodeCoverageMetaThreatActor"),
        ),
      ),
    ];

    return {
      title: t("relationView.nodeCoverageTitle.avoidance", {
        title: getNodeTitle(RelationType.avoidance, avoidanceKey),
      }),
      summary: t("relationView.nodeCoverageSummary.avoidance", {
        risks: riskKeys.length,
        tools: attackToolKeys.length,
        actors: threatActorKeys.length,
      }),
      severity: items.length === 0 ? "warning" : "normal",
      metrics: [
        {
          label: t("relationView.nodeCoverageMetricRisk"),
          value: riskKeys.length,
        },
        {
          label: t("relationView.nodeCoverageMetricTool"),
          value: attackToolKeys.length,
        },
        {
          label: t("relationView.nodeCoverageMetricThreatActor"),
          value: threatActorKeys.length,
        },
      ],
      items,
      notice:
        items.length === 0
          ? t("relationView.nodeCoverageNotice.avoidance")
          : undefined,
    };
  };

  const buildAttackToolCoverage = (
    attackToolKey: string,
  ): NodeCoverageSummary | null => {
    const attackTool =
      BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    if (!attackTool) return null;

    const risks = unique([
      ...attackTool.directCauseRisks,
      ...attackTool.indirectSupportRisks,
    ]).filter((riskKey) => riskKey in BREAK.risks);
    const avoidances = unique(attackTool.avoidances).filter(
      (avoidanceKey) => avoidanceKey in BREAK.avoidances,
    );

    return {
      title: t("relationView.nodeCoverageTitle.attackTool", {
        title: getNodeTitle(RelationType.attackTool, attackToolKey),
      }),
      summary: t("relationView.nodeCoverageSummary.attackTool", {
        risks: risks.length,
        avoidances: avoidances.length,
      }),
      severity: risks.length === 0 ? "warning" : "normal",
      metrics: [
        {
          label: t("relationView.nodeCoverageMetricRisk"),
          value: risks.length,
        },
        {
          label: t("relationView.nodeCoverageMetricAvoidance"),
          value: avoidances.length,
        },
      ],
      items: [
        ...risks.map((riskKey) =>
          buildNodeItem(
            RelationType.risk,
            riskKey,
            ["AttackTool.directCauseRisks", "AttackTool.indirectSupportRisks"],
            t("relationView.nodeCoverageMetaRisk"),
          ),
        ),
        ...sortAvoidanceItems(
          avoidances.map((avoidanceKey) =>
            buildAvoidanceNodeItem(
              avoidanceKey,
              ["AttackTool.avoidances"],
              t("relationView.nodeCoverageMetaTool"),
            ),
          ),
        ),
      ],
      notice:
        risks.length === 0
          ? t("relationView.nodeCoverageNotice.attackTool")
          : undefined,
    };
  };

  const buildThreatActorCoverage = (
    threatActorKey: string,
  ): NodeCoverageSummary | null => {
    const threatActor =
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    if (!threatActor) return null;

    const toolKeys = unique([
      ...threatActor.buildAttackTools,
      ...threatActor.useAttackTools,
    ]).filter((attackToolKey) => attackToolKey in BREAK.attackTools);
    const riskKeys = unique([
      ...threatActor.directCauseRisks,
      ...threatActor.indirectSupportRisks,
    ]).filter((riskKey) => riskKey in BREAK.risks);

    return {
      title: t("relationView.nodeCoverageTitle.threatActor", {
        title: getNodeTitle(RelationType.threatActor, threatActorKey),
      }),
      summary: t("relationView.nodeCoverageSummary.threatActor", {
        tools: toolKeys.length,
        risks: riskKeys.length,
      }),
      severity:
        toolKeys.length === 0 && riskKeys.length === 0 ? "warning" : "normal",
      metrics: [
        {
          label: t("relationView.nodeCoverageMetricTool"),
          value: toolKeys.length,
        },
        {
          label: t("relationView.nodeCoverageMetricRisk"),
          value: riskKeys.length,
        },
      ],
      items: [
        ...toolKeys.map((attackToolKey) =>
          buildNodeItem(
            RelationType.attackTool,
            attackToolKey,
            ["ThreatActor.buildAttackTools", "ThreatActor.useAttackTools"],
            t("relationView.nodeCoverageMetaTool"),
          ),
        ),
        ...riskKeys.map((riskKey) =>
          buildNodeItem(
            RelationType.risk,
            riskKey,
            [
              "ThreatActor.directCauseRisks",
              "ThreatActor.indirectSupportRisks",
            ],
            t("relationView.nodeCoverageMetaRisk"),
          ),
        ),
      ],
      notice:
        toolKeys.length === 0 && riskKeys.length === 0
          ? t("relationView.nodeCoverageNotice.threatActor")
          : undefined,
    };
  };

  return {
    buildAttackToolCoverage,
    buildAvoidanceCoverage,
    buildRiskCoverage,
    buildThreatActorCoverage,
  };
};
