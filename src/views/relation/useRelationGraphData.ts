import { computed, reactive, ref, type Ref } from "vue";
import BREAK from "@/BREAK";
import { createRelationAttackPathData } from "@/views/relation/relationAttackPath";
import { createRelationGraphBuilder } from "@/views/relation/relationGraphBuilder";
import { createRelationGraphInsights } from "@/views/relation/relationGraphInsights";
import {
  createRelationTypeMapping,
  RelationType,
  isRelationEntityType,
  type Line,
  type Node,
  type RelationLegendItem,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface UseRelationGraphDataOptions {
  t: Translate;
  isDark: Ref<boolean>;
  isMobile: Ref<boolean>;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getGraphColor: (key: "background" | "line" | "lineText" | "nodeText" | "nodeBorder" | "subNodeFill" | "subNodeBorder" | "selectedNodeBorder" | "selectedNodeGlow") => string;
  getRelationLineColor: (key: "avoidanceMeans" | "directCauseRisk" | "indirectSupportRisk" | "buildAttackTool" | "useAttackTool" | "causeRisk" | "relatedTerm" | "subRisk" | "subAvoidance" | "subAttackTool" | "subThreatActor" | "attackToolMaker") => string;
  renderNetworkChart: (notMerge?: boolean) => void;
}

export const useRelationGraphData = ({
  t,
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

  const relationLegendItems = computed<RelationLegendItem[]>(() => [
    {
      color: getRelationLineColor("avoidanceMeans"),
      label: t("relationLine.avoidanceMeans"),
      fields: ["Risk.avoidances", "AttackTool.avoidances"],
    },
    {
      color: getRelationLineColor("directCauseRisk"),
      label: t("relationLine.directCauseRisk"),
      fields: ["AttackTool.directCauseRisks", "ThreatActor.directCauseRisks"],
    },
    {
      color: getRelationLineColor("indirectSupportRisk"),
      label: t("relationLine.indirectSupportRisk"),
      fields: ["AttackTool.indirectSupportRisks", "ThreatActor.indirectSupportRisks"],
    },
    {
      color: getRelationLineColor("buildAttackTool"),
      label: t("relationLine.buildAttackTool"),
      fields: ["ThreatActor.buildAttackTools"],
    },
    {
      color: getRelationLineColor("useAttackTool"),
      label: t("relationLine.useAttackTool"),
      fields: ["ThreatActor.useAttackTools"],
    },
    {
      color: getRelationLineColor("causeRisk"),
      label: t("relationLine.causeRisk"),
      fields: ["AttackTool.directCauseRisks", "AttackTool.indirectSupportRisks", "ThreatActor.directCauseRisks"],
    },
    {
      color: getRelationLineColor("relatedTerm"),
      label: t("relationLine.relatedTerm"),
      fields: [
        "Term.relatedRisks",
        "Term.relatedAvoidances",
        "Term.relatedAttackTools",
        "Term.relatedThreatActors",
      ],
    },
    { color: getRelationLineColor("subRisk"), label: t("relationLine.subRisk"), fields: ["Risk child ID"] },
    { color: getRelationLineColor("subAvoidance"), label: t("relationLine.subAvoidance"), fields: ["Avoidance child ID"] },
    { color: getRelationLineColor("subAttackTool"), label: t("relationLine.subAttackTool"), fields: ["AttackTool child ID"] },
    { color: getRelationLineColor("subThreatActor"), label: t("relationLine.subThreatActor"), fields: ["ThreatActor child ID"] },
    { color: getRelationLineColor("attackToolMaker"), label: t("relationLine.attackToolMaker"), fields: ["ThreatActor.buildAttackTools"] },
  ]);

  const relationTypeItems = computed(() =>
    Object.entries(RelationTypeMapping).map(([key, item]) => ({
      key,
      title: item.title,
      color: item.color,
    }))
  );

  const subNodeFilterColor = computed(() => getGraphColor("subNodeFill"));

  const getBreakKey = (type: RelationType) =>
    RelationTypeMapping[type as keyof typeof RelationTypeMapping].BreakKey as keyof typeof BREAK;

  const getCurrentEntityOptions = computed(() => BREAK[getBreakKey(relType.value)] as Record<string, unknown>);

  const getEntityTitle = (type: Exclude<RelationType, RelationType.all>, key: string) => {
    const breakKey = RelationTypeMapping[type].BreakKey;
    return t(`BREAK.${breakKey}.${key}.title`);
  };

  const getNodeLabel = (type: Exclude<RelationType, RelationType.all>, key: string) =>
    `${key} ${getEntityTitle(type, key)}`;

  const getSankeyNodeName = (type: Exclude<RelationType, RelationType.all>, key: string) =>
    `${RelationTypeMapping[type].title}: ${getNodeLabel(type, key)}`;

  const getNodeTitle = (type: Exclude<RelationType, RelationType.all>, key: string) => {
    const breakKey = RelationTypeMapping[type].BreakKey;
    return t(`BREAK.${breakKey}.${key}.title`);
  };

  const getGraphNodeText = (type: Exclude<RelationType, RelationType.all>, key: string) =>
    `${key}\n${getNodeTitle(type, key)}`;

  const escapeTooltipHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatRelationFieldsTooltip = (fields: string[]) => fields.map((field) => escapeTooltipHtml(field)).join("<br>");

  const getNodeTypeTitle = (type: string) =>
    isRelationEntityType(type) ? RelationTypeMapping[type].title : type;

  const getRelationSourceFields = (line: Line, sourceType?: string, targetType?: string) => {
    const fromType = sourceType ?? nodes.find((node) => node.id === line.from)?.type;
    const toType = targetType ?? nodes.find((node) => node.id === line.to)?.type;
    const fields = new Set<string>();

    if (line.text === t("relationLine.avoidanceMeans")) {
      if (fromType === RelationType.risk) fields.add("Risk.avoidances");
      if (fromType === RelationType.attackTool || toType === RelationType.attackTool) fields.add("AttackTool.avoidances");
    }
    if (line.text === t("relationLine.directCauseRisk")) {
      if (fromType === RelationType.attackTool) fields.add("AttackTool.directCauseRisks");
      if (fromType === RelationType.threatActor) fields.add("ThreatActor.directCauseRisks");
    }
    if (line.text === t("relationLine.indirectSupportRisk")) {
      if (fromType === RelationType.attackTool) fields.add("AttackTool.indirectSupportRisks");
      if (fromType === RelationType.threatActor) fields.add("ThreatActor.indirectSupportRisks");
    }
    if (line.text === t("relationLine.buildAttackTool")) fields.add("ThreatActor.buildAttackTools");
    if (line.text === t("relationLine.useAttackTool")) fields.add("ThreatActor.useAttackTools");
    if (line.text === t("relationLine.relatedTerm")) {
      if (fromType === RelationType.term && toType === RelationType.risk) fields.add("Term.relatedRisks");
      if (fromType === RelationType.term && toType === RelationType.avoidance) fields.add("Term.relatedAvoidances");
      if (fromType === RelationType.term && toType === RelationType.attackTool) fields.add("Term.relatedAttackTools");
      if (fromType === RelationType.term && toType === RelationType.threatActor) fields.add("Term.relatedThreatActors");
    }
    if (line.text === t("relationLine.attackToolMaker")) fields.add("ThreatActor.buildAttackTools");
    if (line.text === t("relationLine.causeRisk")) {
      if (fromType === RelationType.attackTool) {
        fields.add("AttackTool.directCauseRisks");
        fields.add("AttackTool.indirectSupportRisks");
      }
      if (fromType === RelationType.threatActor) {
        fields.add("ThreatActor.directCauseRisks");
        fields.add("ThreatActor.indirectSupportRisks");
      }
    }
    if (line.text === t("relationLine.subRisk")) fields.add("Risk child ID");
    if (line.text === t("relationLine.subAvoidance")) fields.add("Avoidance child ID");
    if (line.text === t("relationLine.subAttackTool")) fields.add("AttackTool child ID");
    if (line.text === t("relationLine.subThreatActor")) fields.add("ThreatActor child ID");

    return [...fields];
  };

  const getRelationPriority = (lineText: string) => {
    if (lineText === t("relationLine.directCauseRisk")) return 0;
    if (lineText === t("relationLine.buildAttackTool")) return 1;
    if (lineText === t("relationLine.useAttackTool")) return 2;
    if (lineText === t("relationLine.avoidanceMeans")) return 3;
    if (lineText === t("relationLine.indirectSupportRisk")) return 4;
    return 5;
  };

  const isDirectRelationLine = (lineText: string) =>
    [t("relationLine.directCauseRisk"), t("relationLine.buildAttackTool"), t("relationLine.useAttackTool")].includes(
      lineText
    );

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
    filterRelationType,
    filterSubNode,
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
  });

  const {
    sankeyChartHeight,
    sankeyData,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathSummary,
  } = createRelationAttackPathData({
    t,
    isMobile,
    relType,
    relKey,
    selectedNetworkNode,
    RelationTypeMapping,
    getSankeyNodeName,
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

  const isPathNodeCurrentSelection = (nodeId: string) => selectedNetworkNodeId.value === nodeId;
  const isRelationOnSelectedPath = (relationKey: string) => selectedNodePathRelationKeys.value.has(relationKey);

  return {
    addRootNode,
    buildNodeSummary,
    clearDraggedNodePositions,
    draggedNodePositions,
    filterLineType,
    filterRelationType,
    filterSubNode,
    findNodeById,
    formatRelationFieldsTooltip,
    genNetworkGraphData,
    getCurrentEntityOptions,
    getNodeTitle,
    getNodeTypeTitle,
    getRelationPriority,
    getRelationSourceFields,
    getSankeyNodeName,
    isDirectRelationLine,
    isPathNodeCurrentSelection,
    isRelationOnSelectedPath,
    isCurrentNodeRoot,
    jsonData,
    lines,
    nodes,
    rebuildGraphData,
    refreshGraphAfterVisible,
    relationLegendItems,
    relationTypeItems,
    rootNodeRelations,
    sankeyChartHeight,
    sankeyData,
    selectedNetworkNode,
    selectedNetworkNodeId,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathSummary,
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
    subNodeFilterColor,
    visibleRelationLegendItems,
    wrapLabelText,
  };
};
