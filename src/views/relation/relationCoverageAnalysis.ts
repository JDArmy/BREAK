import { computed, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import { RelationType, type Node, type NodeCoverageSummary } from "@/views/relation/relationTypes";

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

  return {
    selectedNodeCoverageSummary,
  };
};
