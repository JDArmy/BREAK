import { computed, reactive, ref, type Ref } from "vue";
import BREAK from "@/BREAK";
import { createRelationAttackPathData } from "@/views/relation/relationAttackPath";
import { createRelationBusinessDomainImpact } from "@/views/relation/relationBusinessDomainImpact";
import { createRelationCoverageAnalysis } from "@/views/relation/relationCoverageAnalysis";
import { createRelationExplanationHelpers } from "@/views/relation/relationExplanation";
import { createRelationGraphBuilder } from "@/views/relation/relationGraphBuilder";
import { createRelationGraphInsights } from "@/views/relation/relationGraphInsights";
import {
  createRelationTypeMapping,
  RelationType,
  isRelationEntityType,
  type Line,
  type Node,
  type RelationEntityType,
  type RelationLegendItem,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface UseRelationGraphDataOptions {
  t: Translate;
  locale: Ref<string>;
  isDark: Ref<boolean>;
  isMobile: Ref<boolean>;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getGraphColor: (
    key:
      | "background"
      | "line"
      | "lineText"
      | "nodeText"
      | "nodeBorder"
      | "subNodeFill"
      | "subNodeBorder"
      | "selectedNodeBorder"
      | "selectedNodeGlow",
  ) => string;
  getRelationLineColor: (
    key:
      | "avoidanceMeans"
      | "directCauseRisk"
      | "indirectSupportRisk"
      | "riskPrerequisite"
      | "riskCoOccurrence"
      | "riskEscalation"
      | "riskVariant"
      | "avoidancePrerequisite"
      | "avoidanceComplement"
      | "avoidanceAlternative"
      | "avoidanceMitigatesGap"
      | "attackToolPrerequisite"
      | "attackToolCoUsed"
      | "attackToolAlternative"
      | "attackToolCapabilityUpgrade"
      | "buildAttackTool"
      | "useAttackTool"
      | "causeRisk"
      | "relatedTerm"
      | "subRisk"
      | "subAvoidance"
      | "subAttackTool"
      | "subThreatActor"
      | "attackToolMaker",
  ) => string;
  renderNetworkChart: (notMerge?: boolean) => void;
}

export const useRelationGraphData = ({
  t,
  locale,
  isMobile,
  relType,
  relKey,
  RelationTypeMapping,
  getGraphColor,
  getRelationLineColor,
  renderNetworkChart,
}: UseRelationGraphDataOptions) => {
  const nodes = reactive([] as Node[]);
  const lines = reactive([] as Line[]);
  const jsonData = reactive({
    rootId: relKey.value,
    nodes,
    lines,
  });
  const selectedNetworkNodeId = ref(relKey.value);

  const relationLegendItems = computed<RelationLegendItem[]>(() => {
    void locale.value;
    return [
      {
        key: "relationLine.avoidanceMeans",
        color: getRelationLineColor("avoidanceMeans"),
        label: t("relationLine.avoidanceMeans"),
        fields: ["Risk.avoidances", "AttackTool.avoidances"],
      },
      {
        key: "relationLine.directCauseRisk",
        color: getRelationLineColor("directCauseRisk"),
        label: t("relationLine.directCauseRisk"),
        fields: ["AttackTool.directCauseRisks", "ThreatActor.directCauseRisks"],
      },
      {
        key: "relationLine.indirectSupportRisk",
        color: getRelationLineColor("indirectSupportRisk"),
        label: t("relationLine.indirectSupportRisk"),
        fields: [
          "AttackTool.indirectSupportRisks",
          "ThreatActor.indirectSupportRisks",
        ],
      },
      {
        key: "relationLine.riskPrerequisite",
        color: getRelationLineColor("riskPrerequisite"),
        label: t("relationLine.riskPrerequisite"),
        fields: ["Risk.relatedRisks"],
      },
      {
        key: "relationLine.riskCoOccurrence",
        color: getRelationLineColor("riskCoOccurrence"),
        label: t("relationLine.riskCoOccurrence"),
        fields: ["Risk.relatedRisks"],
      },
      {
        key: "relationLine.riskEscalation",
        color: getRelationLineColor("riskEscalation"),
        label: t("relationLine.riskEscalation"),
        fields: ["Risk.relatedRisks"],
      },
      {
        key: "relationLine.riskVariant",
        color: getRelationLineColor("riskVariant"),
        label: t("relationLine.riskVariant"),
        fields: ["Risk.relatedRisks"],
      },
      {
        key: "relationLine.avoidancePrerequisite",
        color: getRelationLineColor("avoidancePrerequisite"),
        label: t("relationLine.avoidancePrerequisite"),
        fields: ["Avoidance.relatedAvoidances"],
      },
      {
        key: "relationLine.avoidanceComplement",
        color: getRelationLineColor("avoidanceComplement"),
        label: t("relationLine.avoidanceComplement"),
        fields: ["Avoidance.relatedAvoidances"],
      },
      {
        key: "relationLine.avoidanceAlternative",
        color: getRelationLineColor("avoidanceAlternative"),
        label: t("relationLine.avoidanceAlternative"),
        fields: ["Avoidance.relatedAvoidances"],
      },
      {
        key: "relationLine.avoidanceMitigatesGap",
        color: getRelationLineColor("avoidanceMitigatesGap"),
        label: t("relationLine.avoidanceMitigatesGap"),
        fields: ["Avoidance.relatedAvoidances"],
      },
      {
        key: "relationLine.attackToolPrerequisite",
        color: getRelationLineColor("attackToolPrerequisite"),
        label: t("relationLine.attackToolPrerequisite"),
        fields: ["AttackTool.relatedAttackTools"],
      },
      {
        key: "relationLine.attackToolCoUsed",
        color: getRelationLineColor("attackToolCoUsed"),
        label: t("relationLine.attackToolCoUsed"),
        fields: ["AttackTool.relatedAttackTools"],
      },
      {
        key: "relationLine.attackToolAlternative",
        color: getRelationLineColor("attackToolAlternative"),
        label: t("relationLine.attackToolAlternative"),
        fields: ["AttackTool.relatedAttackTools"],
      },
      {
        key: "relationLine.attackToolCapabilityUpgrade",
        color: getRelationLineColor("attackToolCapabilityUpgrade"),
        label: t("relationLine.attackToolCapabilityUpgrade"),
        fields: ["AttackTool.relatedAttackTools"],
      },
      {
        key: "relationLine.buildAttackTool",
        color: getRelationLineColor("buildAttackTool"),
        label: t("relationLine.buildAttackTool"),
        fields: ["ThreatActor.buildAttackTools"],
      },
      {
        key: "relationLine.useAttackTool",
        color: getRelationLineColor("useAttackTool"),
        label: t("relationLine.useAttackTool"),
        fields: ["ThreatActor.useAttackTools"],
      },
      {
        key: "relationLine.causeRisk",
        color: getRelationLineColor("causeRisk"),
        label: t("relationLine.causeRisk"),
        fields: [
          "AttackTool.directCauseRisks",
          "AttackTool.indirectSupportRisks",
          "ThreatActor.directCauseRisks",
        ],
      },
      {
        key: "relationLine.relatedTerm",
        color: getRelationLineColor("relatedTerm"),
        label: t("relationLine.relatedTerm"),
        fields: [
          "Term.relatedRisks",
          "Term.relatedAvoidances",
          "Term.relatedAttackTools",
          "Term.relatedThreatActors",
        ],
      },
      {
        key: "relationLine.subRisk",
        color: getRelationLineColor("subRisk"),
        label: t("relationLine.subRisk"),
        fields: ["Risk child ID"],
      },
      {
        key: "relationLine.subAvoidance",
        color: getRelationLineColor("subAvoidance"),
        label: t("relationLine.subAvoidance"),
        fields: ["Avoidance child ID"],
      },
      {
        key: "relationLine.subAttackTool",
        color: getRelationLineColor("subAttackTool"),
        label: t("relationLine.subAttackTool"),
        fields: ["AttackTool child ID"],
      },
      {
        key: "relationLine.subThreatActor",
        color: getRelationLineColor("subThreatActor"),
        label: t("relationLine.subThreatActor"),
        fields: ["ThreatActor child ID"],
      },
      {
        key: "relationLine.attackToolMaker",
        color: getRelationLineColor("attackToolMaker"),
        label: t("relationLine.attackToolMaker"),
        fields: ["ThreatActor.buildAttackTools"],
      },
    ];
  });

  const relationTypeItems = computed(() => {
    void locale.value;
    return Object.entries(RelationTypeMapping).map(([key, item]) => ({
      key,
      title: item.title,
      color: item.color,
    }));
  });

  const subNodeFilterColor = computed(() => getGraphColor("subNodeFill"));

  const getBreakKey = (type: RelationType) =>
    (RelationTypeMapping[type as keyof typeof RelationTypeMapping]?.BreakKey ??
      RelationTypeMapping[RelationType.risk].BreakKey) as keyof typeof BREAK;

  const getCurrentEntityOptions = computed(
    () => BREAK[getBreakKey(relType.value)] as Record<string, unknown>,
  );

  const getEntityTitle = (type: RelationEntityType, key: string) => {
    void locale.value;
    const breakKey = RelationTypeMapping[type].BreakKey;
    return t(`BREAK.${breakKey}.${key}.title`);
  };

  const getNodeLabel = (type: RelationEntityType, key: string) =>
    `${key} ${getEntityTitle(type, key)}`;

  const getSankeyNodeName = (type: RelationEntityType, key: string) =>
    `${RelationTypeMapping[type].title}: ${getNodeLabel(type, key)}`;

  const getNodeTitle = (type: RelationEntityType, key: string) => {
    void locale.value;
    const breakKey = RelationTypeMapping[type].BreakKey;
    return t(`BREAK.${breakKey}.${key}.title`);
  };

  const getGraphNodeText = (type: RelationEntityType, key: string) =>
    `${key}\n${getNodeTitle(type, key)}`;

  const ensureRelationNode = (type: RelationEntityType, key: string) => {
    const existingNode = nodes.find((node) => node.id === key);
    if (existingNode) return existingNode;

    const node = {
      id: key,
      type,
      text: getGraphNodeText(type, key),
      color: "",
    } as Node;
    nodes.push(node);
    return node;
  };

  const escapeTooltipHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatRelationFieldsTooltip = (fields: string[]) =>
    fields.map((field) => escapeTooltipHtml(field)).join("<br>");

  const getNodeTypeTitle = (type: string) => {
    void locale.value;
    return isRelationEntityType(type) ? RelationTypeMapping[type].title : type;
  };

  const {
    explainRelation,
    formatEvidenceLevel,
    getRelationPriority,
    getRelationSourceFields,
    isDirectRelationLine,
  } = createRelationExplanationHelpers({ t, nodes });

  const wrapLabelText = (text: string, maxLineLength = 10) => {
    const [id, title = ""] = text.replace(/<br\s*\/?>/gi, "\n").split("\n");
    if (!title) return id;

    const words = title.split(/\s+/).filter(Boolean);
    const labelLines: string[] = [];

    if (words.length > 1) {
      let current = "";
      words.forEach((word) => {
        if (!current) {
          current = word;
        } else if (`${current} ${word}`.length <= maxLineLength) {
          current = `${current} ${word}`;
        } else {
          labelLines.push(current);
          current = word;
        }
      });
      if (current) labelLines.push(current);
    } else {
      for (let index = 0; index < title.length; index += maxLineLength) {
        labelLines.push(title.slice(index, index + maxLineLength));
      }
    }

    return [id, ...labelLines.slice(0, 3)].join("\n");
  };

  const builder = createRelationGraphBuilder({
    t,
    relType,
    relKey,
    nodes,
    lines,
    jsonData,
    selectedNetworkNodeId,
    RelationTypeMapping,
    relationLegendItems,
    getGraphNodeText,
    renderNetworkChart,
  });

  const {
    addRootNode,
    clearDraggedNodePositions,
    draggedNodePositions,
    filterLineType,
    filterRelatedEntity,
    filterRelationType,
    filterSubNode,
    suppressLineTypeAutoAdd,
    totalLineType,
    genNetworkGraphData,
    rebuildGraphData,
    visibleRelationLegendItems,
  } = builder;

  const {
    buildNodeSummary,
    findNodeById,
    rootNodeRelations,
    isCurrentNodeRoot,
    selectedNetworkNode,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodeAnalysisSummary,
    selectedNodeRelatedEntitySummary,
    selectedNodeDiscoveredPaths,
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
  } = createRelationGraphInsights({
    t,
    relKey,
    nodes,
    lines,
    selectedNetworkNodeId,
    getNodeTitle,
    getNodeTypeTitle,
    getRelationPriority,
    isDirectRelationLine,
    getRelationSourceFields,
    explainRelation,
    formatEvidenceLevel,
  });

  const {
    attackPathDetails,
    attackPathFilterOptions,
    attackPathFilters,
    filteredAttackPaths,
    hasActiveAttackPathFilters,
    normalizeAttackPathFilters,
    resetAttackPathFilters,
    riskAvoidanceCoverage,
    sankeyChartHeight,
    sankeyData,
    selectAttackPath,
    selectedAttackPathDetail,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathExplanations,
    selectedNodeAttackPathSummary,
  } = createRelationAttackPathData({
    t,
    isMobile,
    relType,
    relKey,
    selectedNetworkNode,
    RelationTypeMapping,
    getSankeyNodeName,
    getNodeTitle,
  });

  const { selectedNodeCoverageSummary, selectedNodeSpecialInsightSummary } =
    createRelationCoverageAnalysis({
      t,
      relType,
      relKey,
      selectedNetworkNode,
      getNodeTitle,
    });

  const { selectedNodeBusinessDomainImpactSummary } =
    createRelationBusinessDomainImpact({
      t,
      selectedNetworkNode,
      getNodeTitle,
    });

  let refreshGraphRequestId = 0;

  const refreshGraphAfterVisible = () => {
    const requestId = ++refreshGraphRequestId;

    requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (requestId !== refreshGraphRequestId) {
          return;
        }

        rebuildGraphData();
        renderNetworkChart(true);
      }, 0);
    });
  };

  const isPathNodeCurrentSelection = (nodeId: string) =>
    selectedNetworkNodeId.value === nodeId;
  const isRelationOnSelectedPath = (relationKey: string) =>
    selectedNodePathRelationKeys.value.has(relationKey);

  return {
    addRootNode,
    attackPathDetails,
    attackPathFilterOptions,
    attackPathFilters,
    buildNodeSummary,
    clearDraggedNodePositions,
    draggedNodePositions,
    filterLineType,
    filterRelatedEntity,
    filterRelationType,
    filterSubNode,
    suppressLineTypeAutoAdd,
    totalLineType,
    filteredAttackPaths,
    ensureRelationNode,
    explainRelation,
    findNodeById,
    formatEvidenceLevel,
    formatRelationFieldsTooltip,
    genNetworkGraphData,
    getCurrentEntityOptions,
    getNodeTitle,
    getNodeTypeTitle,
    getRelationPriority,
    getRelationSourceFields,
    getSankeyNodeName,
    hasActiveAttackPathFilters,
    isDirectRelationLine,
    isPathNodeCurrentSelection,
    isRelationOnSelectedPath,
    isCurrentNodeRoot,
    jsonData,
    lines,
    normalizeAttackPathFilters,
    nodes,
    rebuildGraphData,
    refreshGraphAfterVisible,
    relationLegendItems,
    relationTypeItems,
    rootNodeRelations,
    resetAttackPathFilters,
    riskAvoidanceCoverage,
    sankeyChartHeight,
    sankeyData,
    selectAttackPath,
    selectedAttackPathDetail,
    selectedNetworkNode,
    selectedNetworkNodeId,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodeAnalysisSummary,
    selectedNodeRelatedEntitySummary,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathExplanations,
    selectedNodeAttackPathSummary,
    selectedNodeBusinessDomainImpactSummary,
    selectedNodeCoverageSummary,
    selectedNodeDiscoveredPaths,
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
    selectedNodeSpecialInsightSummary,
    subNodeFilterColor,
    visibleRelationLegendItems,
    wrapLabelText,
  };
};
