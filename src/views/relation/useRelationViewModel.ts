import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import BREAK from "@/BREAK";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { init, use, type ECharts, type EChartsOption } from "echarts/core";
import { GraphChart, SankeyChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ElMessage } from "element-plus";
import type { DropdownInstance } from "element-plus";

use([GraphChart, SankeyChart, LegendComponent, TooltipComponent, CanvasRenderer]);

enum RelationType {
  risk = "risk",
  avoidance = "avoidance",
  attackTool = "attack-tool",
  threatActor = "threat-actor",
  all = "all",
}

type NetworkLayoutMode = "horizontal" | "lanes" | "split" | "radial";

interface Node {
  id: string;
  type: string;
  text: string;
  color: string;
  data?: { isSubNode?: boolean };
}

interface Line {
  from: string;
  text: string;
  to: string;
}

interface RelationLegendItem {
  color: string;
  label: string;
  fields: string[];
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  text: string;
  labelText: string;
  symbolSize: number;
  itemStyle: {
    color: string;
    borderColor: string;
    borderWidth: number;
    shadowBlur?: number;
    shadowColor?: string;
  };
  label?: {
    color: string;
    fontSize: number;
    fontWeight?: number | string;
  };
  data?: { isSubNode?: boolean };
  x?: number;
  y?: number;
  fixed?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  text: string;
  sourceFields: string[];
  lineStyle: {
    color: string;
    opacity: number;
    curveness: number;
  };
}

interface SankeyNode {
  name: string;
  depth?: number;
  entityType: Exclude<RelationType, RelationType.all>;
  entityKey: string;
  itemStyle: {
    color: string;
  };
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface AttackPath {
  threatActorKey?: string;
  attackToolKey?: string;
  riskKey: string;
  avoidanceKey?: string;
}

const relationTypeColors: Record<
  Exclude<RelationType, RelationType.all>,
  { light: string; dark: string }
> = {
  [RelationType.risk]: { light: "#fed7aa", dark: "#7c2d12" },
  [RelationType.avoidance]: { light: "#bbf7d0", dark: "#14532d" },
  [RelationType.attackTool]: { light: "#bfdbfe", dark: "#1e3a8a" },
  [RelationType.threatActor]: { light: "#fecaca", dark: "#7f1d1d" },
};

const graphColors = {
  background: { light: "#ffffff", dark: "#0f172a" },
  line: { light: "#999999", dark: "#475569" },
  lineText: { light: "#666666", dark: "#94a3b8" },
  nodeText: { light: "#333333", dark: "#e2e8f0" },
  nodeBorder: { light: "#efefef", dark: "#334155" },
  subNodeFill: { light: "#fde7a7", dark: "#7c5a1d" },
  subNodeBorder: { light: "#e0b85b", dark: "#f6d28b" },
  selectedNodeBorder: { light: "#2563eb", dark: "#93c5fd" },
  selectedNodeGlow: { light: "rgba(37, 99, 235, 0.26)", dark: "rgba(147, 197, 253, 0.3)" },
};

const relationLineColors = {
  avoidanceMeans: { light: "#8b5cf6", dark: "#c084fc" },
  directCauseRisk: { light: "#ef4444", dark: "#f87171" },
  indirectSupportRisk: { light: "#f59e0b", dark: "#fbbf24" },
  buildAttackTool: { light: "#0ea5e9", dark: "#38bdf8" },
  useAttackTool: { light: "#14b8a6", dark: "#5eead4" },
  causeRisk: { light: "#dc2626", dark: "#fb7185" },
  subRisk: { light: "#94a3b8", dark: "#64748b" },
  subAvoidance: { light: "#94a3b8", dark: "#64748b" },
  subAttackTool: { light: "#94a3b8", dark: "#64748b" },
  subThreatActor: { light: "#94a3b8", dark: "#64748b" },
  attackToolMaker: { light: "#22c55e", dark: "#4ade80" },
};

const networkLayoutOptions: { value: NetworkLayoutMode; labelKey: string }[] = [
  { value: "horizontal", labelKey: "relationLayout.horizontal" },
  { value: "lanes", labelKey: "relationLayout.lanes" },
  { value: "split", labelKey: "relationLayout.split" },
  { value: "radial", labelKey: "relationLayout.radial" },
];

const networkLayoutZoom: Record<NetworkLayoutMode, number> = {
  horizontal: 1.15,
  lanes: 1.15,
  split: 1.15,
  radial: 1.15,
};

const networkNodeSize = 58;
const networkRootNodeSize = 64;
const networkLabelMaxLineLength = 5;

export const useRelationViewModel = () => {
  const route = useRoute();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isDark } = useTheme();
  const { isMobile, width } = useBreakpoints();

  const getRelationTypeColor = (type: Exclude<RelationType, RelationType.all>) =>
    isDark.value ? relationTypeColors[type].dark : relationTypeColors[type].light;

  const RelationTypeMapping = {
    [RelationType.risk]: {
      get title() { return t("relationType.risk"); },
      relType: RelationType.risk,
      BreakKey: "risks",
      get color() { return getRelationTypeColor(RelationType.risk); },
      disableContextMenu: ref<boolean>(false),
    },
    [RelationType.avoidance]: {
      get title() { return t("relationType.avoidance"); },
      relType: RelationType.avoidance,
      BreakKey: "avoidances",
      get color() { return getRelationTypeColor(RelationType.avoidance); },
      disableContextMenu: ref<boolean>(false),
    },
    [RelationType.attackTool]: {
      get title() { return t("relationType.attackTool"); },
      relType: RelationType.attackTool,
      BreakKey: "attackTools",
      get color() { return getRelationTypeColor(RelationType.attackTool); },
      disableContextMenu: ref<boolean>(false),
    },
    [RelationType.threatActor]: {
      get title() { return t("relationType.threatActor"); },
      relType: RelationType.threatActor,
      BreakKey: "threatActors",
      get color() { return getRelationTypeColor(RelationType.threatActor); },
      disableContextMenu: ref<boolean>(false),
    },
  };

  const relType = ref<RelationType>(route.params.type as RelationType);
  const relKey = ref<string>(route.params.key as string);
  const activeView = ref<"network" | "sankey">(isMobile.value ? "sankey" : "network");

  const sankeyChartRef = ref<HTMLDivElement>();
  const networkChartRef = ref<HTMLDivElement>();
  const networkPaneRef = ref<HTMLDivElement>();
  let sankeyChart: ECharts | null = null;
  let networkChart: ECharts | null = null;

  const networkState = reactive({
    zoom: networkLayoutZoom.horizontal,
    layout: "horizontal" as NetworkLayoutMode,
  });

  const activeNetworkLayoutLabel = computed(
    () =>
      t(
        networkLayoutOptions.find((layout) => layout.value === networkState.layout)?.labelKey ??
          "relationLayout.horizontal"
      )
  );

  const networkLayoutTooltip = computed(
    () => `${t("toolbar.layout")}: ${activeNetworkLayoutLabel.value}`
  );

  const getGraphColor = (key: keyof typeof graphColors) =>
    isDark.value ? graphColors[key].dark : graphColors[key].light;

  const getRelationLineColor = (key: keyof typeof relationLineColors) =>
    isDark.value ? relationLineColors[key].dark : relationLineColors[key].light;

  const subNodeFilterColor = computed(() => getGraphColor("subNodeFill"));

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

  const isRelationEntityType = (type: string): type is Exclude<RelationType, RelationType.all> =>
    [RelationType.risk, RelationType.avoidance, RelationType.attackTool, RelationType.threatActor].includes(
      type as Exclude<RelationType, RelationType.all>
    );

  const getNodeTypeTitle = (type: string) =>
    isRelationEntityType(type) ? RelationTypeMapping[type].title : type;

  const findNodeById = (id: string) => nodes.find((node) => node.id === id);

  const getRelationSourceFields = (line: Line) => {
    const fromType = findNodeById(line.from)?.type;
    const toType = findNodeById(line.to)?.type;
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

  const selectedNetworkNode = computed(() => {
    const selectedNode = nodes.find((node) => node.id === selectedNetworkNodeId.value);
    return selectedNode ?? nodes.find((node) => node.id === relKey.value) ?? null;
  });

  const selectedNetworkNodeTitle = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return "";
    return getNodeTitle(node.type, node.id);
  });

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

  const describeAttackPathRole = (nodeType: Exclude<RelationType, RelationType.all>) => {
    switch (nodeType) {
      case RelationType.threatActor:
        return t("relationView.pathRoleThreatActorDesc");
      case RelationType.attackTool:
        return t("relationView.pathRoleAttackToolDesc");
      case RelationType.risk:
        return t("relationView.pathRoleRiskDesc");
      case RelationType.avoidance:
        return t("relationView.pathRoleAvoidanceDesc");
    }
  };

  const buildRelationSummary = (line: Line, nodeId: string) => {
    const otherNodeId = line.from === nodeId ? line.to : line.from;
    const otherNode = findNodeById(otherNodeId);
    return {
      relationKey: `${line.from}::${line.text}::${line.to}`,
      direction: line.from === nodeId ? t("relationView.outgoing") : t("relationView.incoming"),
      text: line.text,
      priority: getRelationPriority(line.text),
      directness: isDirectRelationLine(line.text) ? t("relationView.direct") : t("relationView.indirect"),
      otherNodeId,
      otherNodeType: otherNode ? getNodeTypeTitle(otherNode.type) : "",
      otherNodeTitle:
        otherNode && isRelationEntityType(otherNode.type) ? getNodeTitle(otherNode.type, otherNode.id) : "",
      sourceFields: getRelationSourceFields(line),
    };
  };

  const buildNodeSummary = (nodeId: string) => {
    const node = findNodeById(nodeId);
    return {
      id: nodeId,
      rawType: node?.type ?? "",
      isSubNode: Boolean(node?.data?.isSubNode),
      type: node ? getNodeTypeTitle(node.type) : "",
      title: node && isRelationEntityType(node.type) ? getNodeTitle(node.type, node.id) : "",
    };
  };

  const selectedNetworkRelations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return [];

    return lines
      .filter((line) => line.from === node.id || line.to === node.id)
      .map((line) => buildRelationSummary(line, node.id))
      .sort((a, b) => a.priority - b.priority || a.otherNodeId.localeCompare(b.otherNodeId));
  });

  const selectedNetworkRelationCounts = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return { incoming: 0, outgoing: 0 };
    return {
      incoming: lines.filter((line) => line.to === node.id).length,
      outgoing: lines.filter((line) => line.from === node.id).length,
    };
  });

  const rootNodeRelations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || node.id === relKey.value) return [];

    return lines
      .filter(
        (line) =>
          (line.from === relKey.value && line.to === node.id) || (line.from === node.id && line.to === relKey.value)
      )
      .map((line) => ({
        text: line.text,
        direction: line.from === relKey.value ? t("relationView.rootToNode") : t("relationView.nodeToRoot"),
        directness: isDirectRelationLine(line.text) ? t("relationView.direct") : t("relationView.indirect"),
        sourceFields: getRelationSourceFields(line),
        priority: getRelationPriority(line.text),
      }))
      .sort((a, b) => a.priority - b.priority);
  });

  const selectedNodeRootPath = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || node.id === relKey.value) return null;

    const adjacency = new Map<string, { nextId: string; line: Line }[]>();
    lines.forEach((line) => {
      const fromEdges = adjacency.get(line.from) ?? [];
      fromEdges.push({ nextId: line.to, line });
      adjacency.set(line.from, fromEdges);

      const toEdges = adjacency.get(line.to) ?? [];
      toEdges.push({ nextId: line.from, line });
      adjacency.set(line.to, toEdges);
    });

    const queue: { nodeId: string; steps: { fromId: string; toId: string; line: Line }[] }[] = [
      { nodeId: relKey.value, steps: [] },
    ];
    const visited = new Set<string>([relKey.value]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      if (current.nodeId === node.id) {
        return {
          hopCount: current.steps.length,
          startNode: buildNodeSummary(relKey.value),
          steps: current.steps.map((step) => ({
            relation: buildRelationSummary(step.line, step.fromId),
            targetNode: buildNodeSummary(step.toId),
            isCurrentTarget: step.toId === node.id,
          })),
        };
      }

      const neighbors = adjacency.get(current.nodeId) ?? [];
      neighbors
        .slice()
        .sort((a, b) => getRelationPriority(a.line.text) - getRelationPriority(b.line.text))
        .forEach(({ nextId, line }) => {
          if (visited.has(nextId)) return;
          visited.add(nextId);
          queue.push({
            nodeId: nextId,
            steps: [...current.steps, { fromId: current.nodeId, toId: nextId, line }],
          });
        });
    }

    return null;
  });

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

  const matchesSelectedEntity = (path: AttackPath) => {
    switch (relType.value) {
      case RelationType.threatActor:
        return path.threatActorKey === relKey.value;
      case RelationType.attackTool:
        return path.attackToolKey === relKey.value;
      case RelationType.risk:
        return path.riskKey === relKey.value;
      case RelationType.avoidance:
        return path.avoidanceKey === relKey.value;
      default:
        return true;
    }
  };

  const getAttackToolRiskKeys = (attackToolKey: string) => {
    const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    return [...new Set([...attackTool.directCauseRisks, ...attackTool.indirectSupportRisks])];
  };

  const getThreatActorRiskKeys = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    return [...new Set([...threatActor.directCauseRisks, ...threatActor.indirectSupportRisks])];
  };

  const getThreatActorAttackToolKeys = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    return [...new Set([...threatActor.buildAttackTools, ...threatActor.useAttackTools])];
  };

  const buildAttackPaths = () => {
    const paths: AttackPath[] = [];

    Object.keys(BREAK.risks).forEach((riskKey) => {
      const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
      const riskAvoidances = risk.avoidances.length > 0 ? risk.avoidances : [undefined];

      const relatedAttackToolKeys = Object.keys(BREAK.attackTools).filter((attackToolKey) =>
        getAttackToolRiskKeys(attackToolKey).includes(riskKey)
      );
      const relatedThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
        getThreatActorRiskKeys(threatActorKey).includes(riskKey)
      );

      relatedAttackToolKeys.forEach((attackToolKey) => {
        const toolThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
          getThreatActorAttackToolKeys(threatActorKey).includes(attackToolKey)
        );
        const threatActorKeys = toolThreatActorKeys.length > 0 ? toolThreatActorKeys : relatedThreatActorKeys;

        if (threatActorKeys.length > 0) {
          threatActorKeys.forEach((threatActorKey) => {
            riskAvoidances.forEach((avoidanceKey) => {
              paths.push({ threatActorKey, attackToolKey, riskKey, avoidanceKey });
            });
          });
        } else {
          riskAvoidances.forEach((avoidanceKey) => {
            paths.push({ attackToolKey, riskKey, avoidanceKey });
          });
        }
      });

      if (relatedAttackToolKeys.length === 0) {
        relatedThreatActorKeys.forEach((threatActorKey) => {
          riskAvoidances.forEach((avoidanceKey) => {
            paths.push({ threatActorKey, riskKey, avoidanceKey });
          });
        });
      }
    });

    return paths.filter(matchesSelectedEntity);
  };

  const selectedNodeAttackPathSummary = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return [];

    const matchingPaths = buildAttackPaths().filter((path) => {
      if (node.type === RelationType.threatActor) return path.threatActorKey === node.id;
      if (node.type === RelationType.attackTool) return path.attackToolKey === node.id;
      if (node.type === RelationType.risk) return path.riskKey === node.id;
      if (node.type === RelationType.avoidance) return path.avoidanceKey === node.id;
      return false;
    });

    const roleSet = new Set<string>();
    if (matchingPaths.some((path) => path.threatActorKey === node.id)) roleSet.add(t("relationView.pathRoleThreatActor"));
    if (matchingPaths.some((path) => path.attackToolKey === node.id)) roleSet.add(t("relationView.pathRoleAttackTool"));
    if (matchingPaths.some((path) => path.riskKey === node.id)) roleSet.add(t("relationView.pathRoleRisk"));
    if (matchingPaths.some((path) => path.avoidanceKey === node.id)) roleSet.add(t("relationView.pathRoleAvoidance"));

    return [...roleSet];
  });

  const selectedNodeAttackPathDescription = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return "";
    return describeAttackPathRole(node.type);
  });

  const selectedNodePathRelationKeys = computed(() => {
    if (!selectedNodeRootPath.value) return new Set<string>();
    return new Set(selectedNodeRootPath.value.steps.map((step) => step.relation.relationKey));
  });

  const selectedNodeRootPreview = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type) || node.id === relKey.value) return null;

    const previewNodes: Node[] = [];
    const previewLines: Line[] = [];

    previewNodes.push({
      id: node.id,
      type: node.type,
      text: node.text,
      color: node.color,
      data: node.data,
    });

    const collectPreviewRelation = (relatedNodeId: string) => {
      const relatedNode = findNodeById(relatedNodeId);
      if (relatedNode && relatedNode.id !== node.id && !previewNodes.some((item) => item.id === relatedNode.id)) {
        previewNodes.push(relatedNode);
      }
    };

    lines.forEach((line) => {
      if (line.from === node.id || line.to === node.id) {
        previewLines.push(line);
        collectPreviewRelation(line.from);
        collectPreviewRelation(line.to);
      }
    });

    const groupedCounts = previewNodes.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});

    return {
      nodeCount: previewNodes.length,
      lineCount: previewLines.length,
      groupedCounts,
    };
  });

  const sankeyData = computed(() => {
    const nodeMap = new Map<string, SankeyNode>();
    const linkMap = new Map<string, SankeyLink>();
    const paths = buildAttackPaths();

    const addNode = (type: Exclude<RelationType, RelationType.all>, key: string, depth: number) => {
      const name = getSankeyNodeName(type, key);
      if (!nodeMap.has(name)) {
        nodeMap.set(name, {
          name,
          depth,
          entityType: type,
          entityKey: key,
          itemStyle: {
            color: RelationTypeMapping[type].color,
          },
        });
      }
      return name;
    };

    const addLink = (source: string, target: string) => {
      const linkKey = `${source}->${target}`;
      const existing = linkMap.get(linkKey);
      if (existing) {
        existing.value += 1;
      } else {
        linkMap.set(linkKey, { source, target, value: 1 });
      }
    };

    paths.forEach((path) => {
      const pathNodes: string[] = [];
      if (path.threatActorKey) {
        pathNodes.push(addNode(RelationType.threatActor, path.threatActorKey, 0));
      }
      if (path.attackToolKey) {
        pathNodes.push(addNode(RelationType.attackTool, path.attackToolKey, 1));
      }
      pathNodes.push(addNode(RelationType.risk, path.riskKey, 2));
      if (path.avoidanceKey) {
        pathNodes.push(addNode(RelationType.avoidance, path.avoidanceKey, 3));
      }

      pathNodes.forEach((nodeName, index) => {
        const nextNodeName = pathNodes[index + 1];
        if (nextNodeName) {
          addLink(nodeName, nextNodeName);
        }
      });
    });

    return {
      nodes: [...nodeMap.values()],
      links: [...linkMap.values()],
    };
  });

  const sankeyChartHeight = computed(() => {
    const nodesByDepth = sankeyData.value.nodes.reduce<Record<number, number>>((acc, node) => {
      const depth = node.depth ?? 0;
      acc[depth] = (acc[depth] ?? 0) + 1;
      return acc;
    }, {});
    const maxLayerNodeCount = Math.max(1, ...Object.values(nodesByDepth));

    return Math.min(Math.max(520, maxLayerNodeCount * 24 + 96), 3200);
  });

  const selectSankeyNode = (node: SankeyNode) => {
    relType.value = node.entityType;
    relKey.value = node.entityKey;
  };

  const sankeyRight = computed(() => {
    if (isMobile.value) return 80;
    if (width.value < 992) return 160;
    return 280;
  });

  const sankeyLabelWidth = computed(() => {
    if (isMobile.value) return 100;
    if (width.value < 992) return 160;
    return 220;
  });

  const renderSankeyChart = () => {
    if (activeView.value !== "sankey" || !sankeyChartRef.value) return;
    if (!sankeyChart) {
      sankeyChart = init(sankeyChartRef.value);
    }
    sankeyChartRef.value.style.height = `${sankeyChartHeight.value}px`;

    sankeyChart.setOption({
      backgroundColor: isDark.value ? "#0f172a" : "#ffffff",
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        formatter: (params: {
          dataType?: string;
          name?: string;
          value?: number;
          data?: Partial<SankeyNode & SankeyLink>;
        }) => {
          const value = params.value ?? params.data?.value ?? 0;
          if (params.dataType === "edge") {
            return [
              `${escapeTooltipHtml(params.data?.source)} -> ${escapeTooltipHtml(params.data?.target)}`,
              `${t("relationView.pathCount")}: ${value}`,
            ].join("<br>");
          }

          return [
            escapeTooltipHtml(params.name ?? params.data?.name),
            `${t("relationView.pathCount")}: ${value}`,
          ].join("<br>");
        },
      },
      series: [
        {
          type: "sankey",
          data: sankeyData.value.nodes,
          links: sankeyData.value.links,
          left: 40,
          right: sankeyRight.value,
          top: 24,
          bottom: 24,
          nodeWidth: 18,
          nodeGap: 10,
          layoutIterations: 48,
          draggable: true,
          emphasis: {
            focus: "adjacency",
          },
          lineStyle: {
            color: "gradient",
            curveness: 0.5,
            opacity: isDark.value ? 0.28 : 0.36,
          },
          label: {
            color: isDark.value ? "#e2e8f0" : "#334155",
            fontSize: 12,
            width: sankeyLabelWidth.value,
            overflow: "truncate",
            ellipsis: "...",
          },
          itemStyle: {
            borderColor: isDark.value ? "#334155" : "#e2e8f0",
            borderWidth: 1,
          },
        },
      ],
    });
    sankeyChart.off("dblclick");
    sankeyChart.on("dblclick", (params) => {
      const node = params.data as Partial<SankeyNode>;
      if (node.entityType && node.entityKey) {
        selectSankeyNode(node as SankeyNode);
      }
    });
    sankeyChart.resize();
  };

  const disposeSankeyChart = () => {
    sankeyChart?.dispose();
    sankeyChart = null;
  };

  const resizeSankeyChart = () => {
    sankeyChart?.resize();
  };

  const addRootNode = () => {
    const breakItemAttr =
      RelationTypeMapping[relType.value as keyof typeof RelationTypeMapping];
    const items = BREAK[breakItemAttr.BreakKey as keyof typeof BREAK];
    const item = items[relKey.value as keyof typeof items] as { title: string };
    if (item === undefined) {
      alert(t("unknownId"));
      return;
    }

    nodes.push({
      id: relKey.value,
      type: breakItemAttr.relType,
      text: getGraphNodeText(breakItemAttr.relType, relKey.value),
      color: breakItemAttr.color,
    } as Node);
  };

  const addRiskAvoidance = (rKey: string) => {
    const avoidanceKeys =
      BREAK.risks[rKey as keyof typeof BREAK.risks].avoidances;
    avoidanceKeys.forEach((avoidanceKey) => {
      nodes.push({
        id: avoidanceKey,
        type: RelationType.avoidance,
        text: getGraphNodeText(RelationType.avoidance, avoidanceKey),
        color: RelationTypeMapping[RelationType.avoidance].color,
      } as Node);
      lines.push({
        from: rKey,
        text: t("relationLine.avoidanceMeans"),
        to: avoidanceKey,
      } as Line);
    });
  };

  const addRiskAttackTool = (rKey: string) => {
    const directAttackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) => {
      const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
      return at.directCauseRisks.includes(rKey);
    });
    const indirectAttackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) => {
      const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
      return at.indirectSupportRisks.includes(rKey);
    });
    directAttackToolKeys.forEach((attackToolKey) => {
      nodes.push({
        id: attackToolKey,
        type: RelationType.attackTool,
        text: getGraphNodeText(RelationType.attackTool, attackToolKey),
        color: RelationTypeMapping[RelationType.attackTool].color,
      } as Node);
      lines.push({
        from: attackToolKey,
        text: t("relationLine.directCauseRisk"),
        to: rKey,
      } as Line);
    });
    indirectAttackToolKeys.forEach((attackToolKey) => {
      nodes.push({
        id: attackToolKey,
        type: RelationType.attackTool,
        text: getGraphNodeText(RelationType.attackTool, attackToolKey),
        color: RelationTypeMapping[RelationType.attackTool].color,
      } as Node);
      lines.push({
        from: attackToolKey,
        text: t("relationLine.indirectSupportRisk"),
        to: rKey,
      } as Line);
    });
  };

  const addRisk_AvoidanceAttackToolRelation = (rKey: string) => {
    const avoidanceKeys =
      BREAK.risks[rKey as keyof typeof BREAK.risks].avoidances;
    const attackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) => {
      const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
      return at.directCauseRisks.includes(rKey) || at.indirectSupportRisks.includes(rKey);
    });
    attackToolKeys.forEach((attackToolKey) => {
      avoidanceKeys.forEach((avoidanceKey) => {
        if (
          BREAK.attackTools[
            attackToolKey as keyof typeof BREAK.attackTools
          ].avoidances.includes(avoidanceKey)
        ) {
          lines.push({
            from: avoidanceKey,
            text: t("relationLine.avoidanceMeans"),
            to: attackToolKey,
          } as Line);
        }
      });
    });
  };

  const addRiskThreatActor = (rKey: string) => {
    const directThreatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) => {
      const ta = BREAK.threatActors[taKey as keyof typeof BREAK.threatActors];
      return ta.directCauseRisks.includes(rKey);
    });
    const indirectThreatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) => {
      const ta = BREAK.threatActors[taKey as keyof typeof BREAK.threatActors];
      return ta.indirectSupportRisks.includes(rKey);
    });
    directThreatActorKeys.forEach((threatActorKey) => {
      nodes.push({
        id: threatActorKey,
        type: RelationType.threatActor,
        text: getGraphNodeText(RelationType.threatActor, threatActorKey),
        color: RelationTypeMapping[RelationType.threatActor].color,
      } as Node);
      lines.push({
        from: threatActorKey,
        text: t("relationLine.directCauseRisk"),
        to: rKey,
      } as Line);
    });
    indirectThreatActorKeys.forEach((threatActorKey) => {
      nodes.push({
        id: threatActorKey,
        type: RelationType.threatActor,
        text: getGraphNodeText(RelationType.threatActor, threatActorKey),
        color: RelationTypeMapping[RelationType.threatActor].color,
      } as Node);
      lines.push({
        from: threatActorKey,
        text: t("relationLine.indirectSupportRisk"),
        to: rKey,
      } as Line);
    });
  };

  const addRisk_ThreatActorAttackToolRelation = (rKey: string) => {
    const threatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) => {
      const ta = BREAK.threatActors[taKey as keyof typeof BREAK.threatActors];
      return ta.directCauseRisks.includes(rKey) || ta.indirectSupportRisks.includes(rKey);
    });
    const attackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) => {
      const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
      return at.directCauseRisks.includes(rKey) || at.indirectSupportRisks.includes(rKey);
    });

    threatActorKeys.forEach((threatActorKey) => {
      attackToolKeys.forEach((attackToolKey) => {
        if (
          BREAK.threatActors[
            threatActorKey as keyof typeof BREAK.threatActors
          ].useAttackTools.includes(attackToolKey)
        ) {
          lines.push({
            from: threatActorKey,
            text: t("relationLine.useAttackTool"),
            to: attackToolKey,
          } as Line);
        } else if (
          BREAK.threatActors[
            threatActorKey as keyof typeof BREAK.threatActors
          ].buildAttackTools.includes(attackToolKey)
        ) {
          lines.push({
            from: threatActorKey,
            text: t("relationLine.buildAttackTool"),
            to: attackToolKey,
          } as Line);
        }
      });
    });
  };

  const addRiskSubrisk = (rKey: string) => {
    const subriskKeys = Object.keys(BREAK.risks).filter(
      (riskKey) => riskKey.includes(rKey) && riskKey != rKey
    );
    subriskKeys.forEach((subriskKey) => {
      nodes.push({
        id: subriskKey,
        type: RelationType.risk,
        text: getGraphNodeText(RelationType.risk, subriskKey),
        color: RelationTypeMapping[RelationType.risk].color,
        data: { isSubNode: true },
      } as Node);
      lines.push({
        from: rKey,
        text: t("relationLine.subRisk"),
        to: subriskKey,
      } as Line);
    });
  };

  const addAvoidanceRisk = (avoidanceKey: string) => {
    const riskKeys = Object.keys(BREAK.risks).filter((rKey) =>
      BREAK.risks[rKey as keyof typeof BREAK.risks].avoidances.includes(
        avoidanceKey as never
      )
    );
    riskKeys.forEach((riskKey) => {
      nodes.push({
        id: riskKey,
        type: RelationType.risk,
        text: getGraphNodeText(RelationType.risk, riskKey),
        color: RelationTypeMapping[RelationType.risk].color,
      } as Node);
      lines.push({
        from: riskKey,
        text: t("relationLine.avoidanceMeans"),
        to: avoidanceKey,
      } as Line);
    });
  };

  const addAvoidanceSubavoidance = (aKey: string) => {
    const subavoidanceKeys = Object.keys(BREAK.avoidances).filter(
      (avoidanceKey) => avoidanceKey.includes(aKey) && avoidanceKey != aKey
    );
    subavoidanceKeys.forEach((subavoidanceKey) => {
      nodes.push({
        id: subavoidanceKey,
        type: RelationType.avoidance,
        text: getGraphNodeText(RelationType.avoidance, subavoidanceKey),
        color: RelationTypeMapping[RelationType.avoidance].color,
        data: { isSubNode: true },
      } as Node);
      lines.push({
        from: aKey,
        text: t("relationLine.subAvoidance"),
        to: subavoidanceKey,
      } as Line);
    });
  };

  const addAttackToolRisk = (attackToolKey: string) => {
    const at = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    const directRiskKeys: string[] = at.directCauseRisks;
    const indirectRiskKeys: string[] = at.indirectSupportRisks;
    directRiskKeys.forEach((riskKey) => {
      nodes.push({
        id: riskKey,
        type: RelationType.risk,
        text: getGraphNodeText(RelationType.risk, riskKey),
        color: RelationTypeMapping[RelationType.risk].color,
      } as Node);
      lines.push({
        from: attackToolKey,
        text: t("relationLine.directCauseRisk"),
        to: riskKey,
      } as Line);
    });
    indirectRiskKeys.forEach((riskKey) => {
      nodes.push({
        id: riskKey,
        type: RelationType.risk,
        text: getGraphNodeText(RelationType.risk, riskKey),
        color: RelationTypeMapping[RelationType.risk].color,
      } as Node);
      lines.push({
        from: attackToolKey,
        text: t("relationLine.indirectSupportRisk"),
        to: riskKey,
      } as Line);
    });
  };

  const addAttackToolAvoidance = (attackToolKey: string) => {
    const avoidanceKeys =
      BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
        .avoidances;
    avoidanceKeys.forEach((avoidanceKey) => {
      nodes.push({
        id: avoidanceKey,
        type: RelationType.avoidance,
        text: getGraphNodeText(RelationType.avoidance, avoidanceKey),
        color: RelationTypeMapping[RelationType.avoidance].color,
      } as Node);
      lines.push({
        from: attackToolKey,
        text: t("relationLine.avoidanceMeans"),
        to: avoidanceKey,
      } as Line);
    });
  };

  const addAttackTool_RiskAvoidanceRelation = (attackToolKey: string) => {
    const at = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    const riskKeys: string[] = [...at.directCauseRisks, ...at.indirectSupportRisks];
    const avoidanceKeys =
      BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
        .avoidances;
    riskKeys.forEach((riskKey) => {
      BREAK.risks[riskKey as keyof typeof BREAK.risks].avoidances.forEach(
        (avoidanceKey) => {
          if (avoidanceKeys.includes(avoidanceKey)) {
            lines.push({
              from: riskKey,
              text: t("relationLine.avoidanceMeans"),
              to: avoidanceKey,
            } as Line);
          }
        }
      );
    });
  };

  const addAttackToolThreatActor = (attackToolKey: string) => {
    const builderThreatActorKeys = Object.keys(BREAK.threatActors).filter(
      (taKey) =>
        BREAK.threatActors[
          taKey as keyof typeof BREAK.threatActors
        ].buildAttackTools.includes(attackToolKey as never)
    );
    builderThreatActorKeys.forEach((builderThreatActorKey) => {
      nodes.push({
        id: builderThreatActorKey,
        type: RelationType.threatActor,
        text: getGraphNodeText(RelationType.threatActor, builderThreatActorKey),
        color: RelationTypeMapping[RelationType.threatActor].color,
      } as Node);
      lines.push({
        from: builderThreatActorKey,
        text: t("relationLine.buildAttackTool"),
        to: attackToolKey,
      } as Line);
    });

    const userThreatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) =>
      BREAK.threatActors[
        taKey as keyof typeof BREAK.threatActors
      ].useAttackTools.includes(attackToolKey as never)
    );
    userThreatActorKeys.forEach((userThreatActorKey) => {
      nodes.push({
        id: userThreatActorKey,
        type: RelationType.threatActor,
        text: getGraphNodeText(RelationType.threatActor, userThreatActorKey),
        color: RelationTypeMapping[RelationType.threatActor].color,
      } as Node);
      lines.push({
        from: userThreatActorKey,
        text: t("relationLine.useAttackTool"),
        to: attackToolKey,
      } as Line);
    });
  };

  const addAttackTool_ThreatActorRiskRelation = (attackToolKey: string) => {
    const builderThreatActorKeys = Object.keys(BREAK.threatActors).filter(
      (taKey) =>
        BREAK.threatActors[
          taKey as keyof typeof BREAK.threatActors
        ].buildAttackTools.includes(attackToolKey as never)
    );
    const userThreatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) =>
      BREAK.threatActors[
        taKey as keyof typeof BREAK.threatActors
      ].useAttackTools.includes(attackToolKey as never)
    );
    const at = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    const riskKeys: string[] = [...at.directCauseRisks, ...at.indirectSupportRisks];
    builderThreatActorKeys.forEach((builderThreatActorKey) => {
      riskKeys.forEach((riskKey) => {
        const ta = BREAK.threatActors[
          builderThreatActorKey as keyof typeof BREAK.threatActors
        ];
        if (
          ta.directCauseRisks.includes(riskKey) || ta.indirectSupportRisks.includes(riskKey)
        ) {
          lines.push({
            from: riskKey,
            text: t("relationLine.attackToolMaker"),
            to: builderThreatActorKey,
          } as Line);
        }
      });
    });
    userThreatActorKeys.forEach((userThreatActorKey) => {
      riskKeys.forEach((riskKey) => {
        const ta = BREAK.threatActors[
          userThreatActorKey as keyof typeof BREAK.threatActors
        ];
        if (
          ta.directCauseRisks.includes(riskKey) || ta.indirectSupportRisks.includes(riskKey)
        ) {
          lines.push({
            from: userThreatActorKey,
            text: t("relationLine.causeRisk"),
            to: riskKey,
          } as Line);
        }
      });
    });
  };

  const addAttackToolSubattackTool = (atKey: string) => {
    const subattackToolKeys = Object.keys(BREAK.attackTools).filter(
      (attackToolKey) => attackToolKey.includes(atKey) && attackToolKey != atKey
    );
    subattackToolKeys.forEach((subattackToolKey) => {
      nodes.push({
        id: subattackToolKey,
        type: RelationType.attackTool,
        text:
          getGraphNodeText(RelationType.attackTool, subattackToolKey),
        color: RelationTypeMapping[RelationType.attackTool].color,
        data: { isSubNode: true },
      } as Node);
      lines.push({
        from: atKey,
        text: t("relationLine.subAttackTool"),
        to: subattackToolKey,
      } as Line);
    });
  };

  const addThreatActorRisk = (threatActorKey: string) => {
    const ta = BREAK.threatActors[threatActorKey];
    const directRiskKeys: string[] = ta.directCauseRisks;
    const indirectRiskKeys: string[] = ta.indirectSupportRisks;
    directRiskKeys.forEach((riskKey) => {
      nodes.push({
        id: riskKey,
        type: RelationType.risk,
        text: getGraphNodeText(RelationType.risk, riskKey),
        color: RelationTypeMapping[RelationType.risk].color,
      } as Node);
      lines.push({
        from: threatActorKey,
        text: t("relationLine.directCauseRisk"),
        to: riskKey,
      } as Line);
    });
    indirectRiskKeys.forEach((riskKey) => {
      nodes.push({
        id: riskKey,
        type: RelationType.risk,
        text: getGraphNodeText(RelationType.risk, riskKey),
        color: RelationTypeMapping[RelationType.risk].color,
      } as Node);
      lines.push({
        from: threatActorKey,
        text: t("relationLine.indirectSupportRisk"),
        to: riskKey,
      } as Line);
    });
  };

  const addThreatActorAttackTool = (threatActorKey: string) => {
    const buildAttackToolKeys =
      BREAK.threatActors[threatActorKey].buildAttackTools;
    buildAttackToolKeys.forEach((buildAttackToolKey) => {
      nodes.push({
        id: buildAttackToolKey,
        type: RelationType.attackTool,
        text: getGraphNodeText(RelationType.attackTool, buildAttackToolKey),
        color: RelationTypeMapping[RelationType.attackTool].color,
      } as Node);
      lines.push({
        from: threatActorKey,
        text: t("relationLine.buildAttackTool"),
        to: buildAttackToolKey,
      } as Line);
    });

    const useAttackToolKeys = BREAK.threatActors[threatActorKey].useAttackTools;
    useAttackToolKeys.forEach((useAttackToolKey) => {
      nodes.push({
        id: useAttackToolKey,
        type: RelationType.attackTool,
        text: getGraphNodeText(RelationType.attackTool, useAttackToolKey),
        color: RelationTypeMapping[RelationType.attackTool].color,
      } as Node);
      lines.push({
        from: threatActorKey,
        text: t("relationLine.useAttackTool"),
        to: useAttackToolKey,
      } as Line);
    });
  };

  const addThreatActor_AttackToolRiskRelation = (threatActorKey: string) => {
    const attackToolKeys = [
      ...BREAK.threatActors[threatActorKey].buildAttackTools,
      ...BREAK.threatActors[threatActorKey].useAttackTools,
    ];
    const ta = BREAK.threatActors[threatActorKey];
    const riskKeys: string[] = [...ta.directCauseRisks, ...ta.indirectSupportRisks];
    attackToolKeys.forEach((attackToolKey) => {
      riskKeys.forEach((riskKey) => {
        const at = BREAK.attackTools[
          attackToolKey as keyof typeof BREAK.attackTools
        ];
        if (
          at.directCauseRisks.includes(riskKey) || at.indirectSupportRisks.includes(riskKey)
        ) {
          lines.push({
            from: attackToolKey,
            text: t("relationLine.causeRisk"),
            to: riskKey,
          } as Line);
        }
      });
    });
  };

  const addThreatActorSubthreatActor = (taKey: string) => {
    const subthreatActorKeys = Object.keys(BREAK.threatActors).filter(
      (threatActorKey) =>
        threatActorKey.includes(taKey) && threatActorKey != taKey
    );
    subthreatActorKeys.forEach((subthreatActorKey) => {
      nodes.push({
        id: subthreatActorKey,
        type: RelationType.threatActor,
        text:
          getGraphNodeText(RelationType.threatActor, subthreatActorKey),
        color: RelationTypeMapping[RelationType.threatActor].color,
        data: { isSubNode: true },
      } as Node);
      lines.push({
        from: taKey,
        text: t("relationLine.subThreatActor"),
        to: subthreatActorKey,
      } as Line);
    });
  };

  const filterRelationType = ref([
    RelationType.risk,
    RelationType.avoidance,
    RelationType.attackTool,
    RelationType.threatActor,
  ] as string[]);

  const filterSubNode = ref(true);

  const totalLineType = ref([] as string[]);
  const filterLineType = ref(totalLineType.value);

  const getLineType = () => {
    totalLineType.value.splice(0, totalLineType.value.length);
    lines.forEach((line) => {
      if (!totalLineType.value.includes(line.text)) {
        totalLineType.value.push(line.text);
      }
    });
    totalLineType.value.forEach((lineType) => {
      if (!filterLineType.value.includes(lineType)) {
        filterLineType.value.push(lineType);
      }
    });
  };

  const uniqLines = () => {
    const linesSet = new Set<string>();
    lines.forEach((line) => {
      linesSet.add(JSON.stringify(line));
    });
    lines.splice(0, lines.length);
    linesSet.forEach((line) => {
      lines.push(JSON.parse(line) as Line);
    });
  };

  const uniqNodes = () => {
    const nodeMap = new Map<string, Node>();
    nodes.forEach((node) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    });
    nodes.splice(0, nodes.length, ...nodeMap.values());
  };

  const visibleRelationLegendItems = computed(() =>
    relationLegendItems.value.filter((item) => totalLineType.value.includes(item.label))
  );

  const setNetworkGraphData = () => {
    uniqNodes();
    uniqLines();
    getLineType();
    renderNetworkChart();
  };

  function rebuildGraphData() {
    jsonData.rootId = relKey.value;
    selectedNetworkNodeId.value = relKey.value;
    clearDraggedNodePositions();
    nodes.splice(0, nodes.length);
    lines.splice(0, lines.length);
    addRootNode();
    genNetworkGraphData(RelationType.all, relType.value, relKey.value);
  }

  const refreshGraphAfterVisible = () => {
    rebuildGraphData();
    nextTick(() => {
      renderNetworkChart(true);
    });
  };

  const draggedNodePositions = ref<Record<string, { x: number; y: number }>>({});

  const clearDraggedNodePositions = () => {
    draggedNodePositions.value = {};
  };

  const networkNodeSortOrder: Record<string, number> = {
    [RelationType.threatActor]: 0,
    [RelationType.attackTool]: 1,
    [RelationType.risk]: 2,
    [RelationType.avoidance]: 3,
  };

  const normalizeGraphText = (text: string) => text.replace(/<br\s*\/?>/gi, "\n");

  const createGraphNode = (
    node: Node,
    x: number,
    y: number,
    symbolSize = networkNodeSize
  ): GraphNode => {
    const text = normalizeGraphText(node.text);
    const isSelected = node.id === selectedNetworkNodeId.value;
    const isSubNode = Boolean(node.data?.isSubNode);
    const draggedPosition = draggedNodePositions.value[node.id];
    return {
      id: node.id,
      name: node.id,
      type: node.type,
      text,
      labelText: wrapLabelText(text, networkLabelMaxLineLength),
      symbolSize: isSelected ? symbolSize + 10 : symbolSize,
      itemStyle: {
        color: isSubNode ? getGraphColor("subNodeFill") : node.color,
        borderColor: isSelected
          ? getGraphColor("selectedNodeBorder")
          : isSubNode
            ? getGraphColor("subNodeBorder")
            : getGraphColor("nodeBorder"),
        borderWidth: isSelected ? 3 : 1,
        shadowBlur: isSelected ? 18 : 0,
        shadowColor: isSelected ? getGraphColor("selectedNodeGlow") : "transparent",
      },
      label: {
        color: getGraphColor("nodeText"),
        fontSize: isSelected ? 9 : 8,
        fontWeight: isSelected ? 700 : 500,
      },
      data: node.data,
      fixed: true,
      x: draggedPosition?.x ?? x,
      y: draggedPosition?.y ?? y,
    };
  };

  const createEmptyGroupedNodes = () =>
    ({
      [RelationType.threatActor]: [],
      [RelationType.attackTool]: [],
      [RelationType.risk]: [],
      [RelationType.avoidance]: [],
    } as Record<Exclude<RelationType, RelationType.all>, Node[]>);

  const placeGridNodes = (
    graphNodes: GraphNode[],
    group: Node[],
    layout: { x: number; y: number; columns: number; columnGap?: number; rowGap?: number }
  ) => {
    if (group.length === 0) return;

    const columnGap = layout.columnGap ?? 112;
    const rowGap = layout.rowGap ?? 96;
    const columns = Math.max(1, Math.min(layout.columns, group.length));
    const rowCount = Math.ceil(group.length / columns);
    const width = (columns - 1) * columnGap;
    const height = (rowCount - 1) * rowGap;

    group.forEach((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      graphNodes.push(
        createGraphNode(
          node,
          layout.x + column * columnGap - width / 2,
          layout.y + row * rowGap - height / 2
        )
      );
    });
  };

  const applyHorizontalNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    const groupLayout: Record<
      Exclude<RelationType, RelationType.all>,
      { x: number; y: number; columns: number; columnGap?: number; rowGap?: number }
    > = {
      [RelationType.threatActor]: { x: -720, y: -170, columns: 3, columnGap: 118, rowGap: 100 },
      [RelationType.attackTool]: { x: -340, y: 190, columns: 4, columnGap: 116, rowGap: 100 },
      [RelationType.risk]: { x: 280, y: -170, columns: 4, columnGap: 116, rowGap: 100 },
      [RelationType.avoidance]: { x: 720, y: 180, columns: 4, columnGap: 116, rowGap: 100 },
    };

    Object.entries(groupLayout).forEach(([type, layout]) => {
      placeGridNodes(
        graphNodes,
        groupedNodes[type as Exclude<RelationType, RelationType.all>],
        layout
      );
    });
  };

  const applyLaneNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    const groupLayout: Record<
      Exclude<RelationType, RelationType.all>,
      { x: number; y: number; columns: number; columnGap?: number; rowGap?: number }
    > = {
      [RelationType.threatActor]: { x: 0, y: -440, columns: 8, columnGap: 116, rowGap: 92 },
      [RelationType.attackTool]: { x: 0, y: -165, columns: 8, columnGap: 116, rowGap: 92 },
      [RelationType.risk]: { x: 0, y: 165, columns: 8, columnGap: 116, rowGap: 92 },
      [RelationType.avoidance]: { x: 0, y: 440, columns: 8, columnGap: 116, rowGap: 92 },
    };

    Object.entries(groupLayout).forEach(([type, layout]) => {
      placeGridNodes(
        graphNodes,
        groupedNodes[type as Exclude<RelationType, RelationType.all>],
        layout
      );
    });
  };

  const applySplitNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    const groupLayout: Record<
      Exclude<RelationType, RelationType.all>,
      { x: number; y: number; columns: number; columnGap?: number; rowGap?: number }
    > = {
      [RelationType.threatActor]: { x: -520, y: -245, columns: 4, columnGap: 112, rowGap: 98 },
      [RelationType.attackTool]: { x: -520, y: 245, columns: 4, columnGap: 112, rowGap: 98 },
      [RelationType.risk]: { x: 520, y: -245, columns: 4, columnGap: 112, rowGap: 98 },
      [RelationType.avoidance]: { x: 520, y: 245, columns: 4, columnGap: 112, rowGap: 98 },
    };

    Object.entries(groupLayout).forEach(([type, layout]) => {
      placeGridNodes(
        graphNodes,
        groupedNodes[type as Exclude<RelationType, RelationType.all>],
        layout
      );
    });
  };

  const placeRadialGroupNodes = (
    graphNodes: GraphNode[],
    group: Node[],
    options: { startAngle: number; endAngle: number; radius: number; innerRadius?: number }
  ) => {
    if (group.length === 0) return;

    const angleSpan = options.endAngle - options.startAngle;
    const useInnerRing = group.length > 7;
    group.forEach((node, index) => {
      const ring = useInnerRing && index % 2 === 1 ? options.innerRadius ?? options.radius - 130 : options.radius;
      const angleIndex = useInnerRing ? Math.floor(index / 2) : index;
      const angleCount = useInnerRing ? Math.ceil(group.length / 2) : group.length;
      const angle =
        options.startAngle +
        (angleSpan * (angleIndex + 0.5)) / Math.max(1, angleCount);
      graphNodes.push(createGraphNode(node, Math.cos(angle) * ring, Math.sin(angle) * ring));
    });
  };

  const applyRadialNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    placeRadialGroupNodes(graphNodes, groupedNodes[RelationType.threatActor], {
      startAngle: -Math.PI * 0.95,
      endAngle: -Math.PI * 0.55,
      radius: 650,
    });
    placeRadialGroupNodes(graphNodes, groupedNodes[RelationType.attackTool], {
      startAngle: -Math.PI * 0.45,
      endAngle: -Math.PI * 0.05,
      radius: 520,
    });
    placeRadialGroupNodes(graphNodes, groupedNodes[RelationType.risk], {
      startAngle: Math.PI * 0.05,
      endAngle: Math.PI * 0.45,
      radius: 520,
    });
    placeRadialGroupNodes(graphNodes, groupedNodes[RelationType.avoidance], {
      startAngle: Math.PI * 0.55,
      endAngle: Math.PI * 0.95,
      radius: 650,
    });
  };

  const applyNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    switch (networkState.layout) {
      case "lanes":
        applyLaneNetworkLayout(graphNodes, groupedNodes);
        break;
      case "split":
        applySplitNetworkLayout(graphNodes, groupedNodes);
        break;
      case "radial":
        applyRadialNetworkLayout(graphNodes, groupedNodes);
        break;
      case "horizontal":
      default:
        applyHorizontalNetworkLayout(graphNodes, groupedNodes);
        break;
    }
  };

  const toContextNode = (node: GraphNode): Node => ({
    id: node.id,
    type: node.type,
    text: node.text,
    color: node.itemStyle.color,
    data: node.data,
  });

  const getVisibleNetworkData = () => {
    const visibleNodeKeys = new Set<string>();
    const visibleNodes: Node[] = [];
    const linkMap = new Map<string, GraphLink>();

    nodes.forEach((node) => {
      const isSubNode = node.data?.isSubNode;
      if (
        !filterRelationType.value.includes(node.type) ||
        (isSubNode && !filterSubNode.value)
      ) {
        return;
      }

      visibleNodeKeys.add(node.id);
      visibleNodes.push(node);
    });

    const rootNode = visibleNodes.find((node) => node.id === relKey.value);
    const groupedNodes = visibleNodes
      .filter((node) => node.id !== relKey.value)
      .sort((a, b) => {
        const orderDiff =
          (networkNodeSortOrder[a.type] ?? 99) - (networkNodeSortOrder[b.type] ?? 99);
        return orderDiff || a.id.localeCompare(b.id);
      })
      .reduce<Record<Exclude<RelationType, RelationType.all>, Node[]>>((groups, node) => {
        groups[node.type as Exclude<RelationType, RelationType.all>].push(node);
        return groups;
      }, createEmptyGroupedNodes());

    const graphNodes: GraphNode[] = [];
    if (rootNode) {
      graphNodes.push(createGraphNode(rootNode, 0, 0, networkRootNodeSize));
    }
    applyNetworkLayout(graphNodes, groupedNodes);

    lines.forEach((line) => {
      if (!filterLineType.value.includes(line.text)) return;
      if (!visibleNodeKeys.has(line.from) || !visibleNodeKeys.has(line.to)) return;
      if (!findNodeById(line.from) || !findNodeById(line.to)) return;

      const linkKey = `${line.from}->${line.to}->${line.text}`;
      if (!linkMap.has(linkKey)) {
        const legendItem = relationLegendItems.value.find((item) => item.label === line.text);
        linkMap.set(linkKey, {
          source: line.from,
          target: line.to,
          text: line.text,
          sourceFields: getRelationSourceFields(line),
          lineStyle: {
            color: legendItem?.color ?? getGraphColor("line"),
            opacity: isDark.value ? 0.42 : 0.52,
            curveness: 0.18,
          },
        });
      }
    });

    return {
      nodes: graphNodes,
      links: [...linkMap.values()],
    };
  };

  const dropdownStyle = reactive({
    position: "absolute",
    zIndex: 65535,
    top: "0px",
    left: "0px",
    width: "0px",
    height: "0px",
    visibility: "hidden",
  });
  const dropdown1 = ref<DropdownInstance>();
  const contextMenuSize = {
    width: 264,
    height: 396,
  };

  const disableContextMenuAll = ref(false);
  const disableContextMenuOpenAsRoot = ref(false);
  const nodeType = ref("" as RelationType);
  const nodeId = ref("" as string);

  const closeContextMenu = () => {
    dropdown1.value?.handleClose?.();
    dropdownStyle.visibility = "hidden";
  };

  const touchActionVisible = ref(false);
  const nodeDetailDrawerVisible = ref(false);
  const nodeFilterVisible = ref(true);
  const lineFilterVisible = ref(true);

  const touchActionClose = () => {
    touchActionVisible.value = false;
  };

  const bindNetworkChartEvents = () => {
    if (!networkChart) return;
    networkChart.off("click");
    networkChart.off("dblclick");
    networkChart.off("contextmenu");
    networkChart.off("mouseup");
    networkChart.on("click", (params) => {
      if (params.dataType !== "node") return;
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
      if (isMobile.value) {
        handleNodeTouch(toContextNode(params.data as GraphNode));
      }
    });
    networkChart.on("dblclick", (params) => {
      if (params.dataType !== "node" || !params.event?.event) return;
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
      nodeClick(toContextNode(params.data as GraphNode), params.event.event as MouseEvent);
    });
    networkChart.on("contextmenu", (params) => {
      if (params.dataType !== "node" || !params.event?.event) return;
      params.event.event.preventDefault();
      selectedNetworkNodeId.value = (params.data as GraphNode).id;
      nodeClick(toContextNode(params.data as GraphNode), params.event.event as MouseEvent);
    });
    networkChart.on("mouseup", (params) => {
      if (params.dataType !== "node") return;
      const option = networkChart?.getOption();
      const seriesData = option?.series?.[0] && "data" in option.series[0]
        ? (option.series[0].data as Array<Partial<GraphNode>>)
        : [];
      const draggedData = typeof params.dataIndex === "number" ? seriesData[params.dataIndex] : undefined;
      const data = (draggedData ?? params.data) as Partial<GraphNode>;
      if (typeof data.id !== "string" || typeof data.x !== "number" || typeof data.y !== "number") return;
      draggedNodePositions.value = {
        ...draggedNodePositions.value,
        [data.id]: { x: data.x, y: data.y },
      };
    });
  };

  const clearNetworkNodeHighlight = () => {
    if (!networkChart) return;
    networkChart.dispatchAction({ type: "downplay", seriesIndex: 0 });
  };

  const renderNetworkChart = (notMerge = false) => {
    if (activeView.value !== "network" || !networkChartRef.value) return;
    if (!networkChart) {
      networkChart = init(networkChartRef.value);
      bindNetworkChartEvents();
    }

    const networkData = getVisibleNetworkData();
    const option = {
      backgroundColor: getGraphColor("background"),
      animationDurationUpdate: 300,
      tooltip: {
        trigger: "item",
        formatter: (params: { dataType?: string; data?: GraphNode | GraphLink }) => {
          if (params.dataType === "node") {
            return (params.data as GraphNode).text.replace(/\n/g, "<br>");
          }
          if (params.dataType === "edge") {
            const link = params.data as GraphLink;
            const fields = link.sourceFields.length
              ? `<br>${t("relationView.sourceFields")}: ${link.sourceFields.join(", ")}`
              : "";
            return `${link.text}${fields}`;
          }
          return "";
        },
      },
      series: [
        {
          type: "graph",
          layout: "none",
          data: networkData.nodes,
          links: networkData.links,
          center: ["52%", "50%"],
          roam: true,
          draggable: true,
          label: {
            show: true,
            color: getGraphColor("nodeText"),
            fontSize: 8,
            lineHeight: 10,
            width: 48,
            overflow: "break",
            formatter: (params: { data?: GraphNode }) => params.data?.labelText ?? "",
            rich: {},
          },
          lineStyle: {
            color: getGraphColor("line"),
            opacity: isDark.value ? 0.42 : 0.52,
            curveness: 0.18,
          },
          edgeLabel: {
            show: false,
            color: getGraphColor("lineText"),
            fontSize: 12,
            formatter: (params: { data?: GraphLink }) => params.data?.text ?? "",
          },
          emphasis: {
            focus: "adjacency",
            lineStyle: {
              width: 2,
            },
          },
          blur: {
            itemStyle: {
              opacity: isDark.value ? 0.12 : 0.15,
            },
            label: {
              opacity: isDark.value ? 0.20 : 0.24,
            },
            lineStyle: {
              opacity: isDark.value ? 0.06 : 0.08,
            },
          },
          zoom: networkState.zoom,
          scaleLimit: {
            min: 0.2,
            max: 3,
          },
        },
      ],
    } satisfies EChartsOption;

    networkChart.setOption(option, { notMerge, lazyUpdate: false });
    clearNetworkNodeHighlight();
    networkChart.resize();
  };

  const disposeNetworkChart = () => {
    networkChart?.dispose();
    networkChart = null;
  };

  const resizeNetworkChart = () => {
    networkChart?.resize();
  };

  const zoomNetworkChart = (step: number) => {
    networkState.zoom = Math.min(3, Math.max(0.12, networkState.zoom + step));
    renderNetworkChart(true);
  };

  const changeNetworkLayout = (layout: NetworkLayoutMode) => {
    networkState.layout = layout;
    networkState.zoom = networkLayoutZoom[layout];
    clearDraggedNodePositions();
    renderNetworkChart(true);
  };

  const handleNetworkLayoutCommand = (command: string | number | object) => {
    const layout = command as NetworkLayoutMode;
    if (networkLayoutOptions.some((option) => option.value === layout)) {
      changeNetworkLayout(layout);
    }
  };

  const refreshNetworkChart = () => {
    renderNetworkChart(true);
  };

  const downloadNetworkChart = () => {
    if (!networkChart) return;
    const imageUrl = networkChart.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: getGraphColor("background"),
    });
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `relation-${relType.value}-${relKey.value}.png`;
    link.click();
  };

  const enterFullscreen = async () => {
    const pane = document.querySelector(".network-graph-pane") as HTMLElement | null;
    if (!pane) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await pane.requestFullscreen();
    }
  };

  const genNetworkGraphData = (
    reqType: RelationType,
    currentNodeType: RelationType,
    currentNodeId: string
  ) => {
    if (currentNodeType === RelationType.risk) {
      if (reqType == RelationType.avoidance) {
        addRiskAvoidance(currentNodeId);
      } else if (reqType == RelationType.attackTool) {
        addRiskAttackTool(currentNodeId);
      } else if (reqType == RelationType.threatActor) {
        addRiskThreatActor(currentNodeId);
      } else if (reqType == RelationType.all) {
        addRiskAvoidance(currentNodeId);
        addRiskAttackTool(currentNodeId);
        addRisk_AvoidanceAttackToolRelation(currentNodeId);
        addRiskThreatActor(currentNodeId);
        addRisk_ThreatActorAttackToolRelation(currentNodeId);
        addRiskSubrisk(currentNodeId);
      }
    } else if (currentNodeType === RelationType.avoidance) {
      if (reqType == RelationType.risk) {
        addAvoidanceRisk(currentNodeId);
      }
      if (reqType == RelationType.all) {
        addAvoidanceRisk(currentNodeId);
        addAvoidanceSubavoidance(currentNodeId);
      }
    } else if (currentNodeType === RelationType.attackTool) {
      if (reqType == RelationType.risk) {
        addAttackToolRisk(currentNodeId);
      } else if (reqType == RelationType.avoidance) {
        addAttackToolAvoidance(currentNodeId);
      } else if (reqType == RelationType.threatActor) {
        addAttackToolThreatActor(currentNodeId);
      } else if (reqType == RelationType.all) {
        addAttackToolRisk(currentNodeId);
        addAttackToolAvoidance(currentNodeId);
        addAttackTool_RiskAvoidanceRelation(currentNodeId);
        addAttackToolThreatActor(currentNodeId);
        addAttackTool_ThreatActorRiskRelation(currentNodeId);
        addAttackToolSubattackTool(currentNodeId);
      }
    } else if (currentNodeType === RelationType.threatActor) {
      if (reqType == RelationType.risk) {
        addThreatActorRisk(currentNodeId);
      } else if (reqType == RelationType.attackTool) {
        addThreatActorAttackTool(currentNodeId);
      } else if (reqType == RelationType.all) {
        addThreatActorRisk(currentNodeId);
        addThreatActorAttackTool(currentNodeId);
        addThreatActor_AttackToolRiskRelation(currentNodeId);
        addThreatActorSubthreatActor(currentNodeId);
      }
    }
    setNetworkGraphData();
  };

  const toCsvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;

  const copyContextNodeCsv = async () => {
    const node = findNodeById(nodeId.value);
    if (!node) {
      ElMessage.error(t("relationView.copyFailed"));
      return;
    }

    const centerNode = buildNodeSummary(node.id);
    const relationLines = lines.filter((line) => line.from === node.id || line.to === node.id);
    const relatedNodes = new Map<string, ReturnType<typeof buildNodeSummary>>();
    relatedNodes.set(centerNode.id, centerNode);

    const relationRows = relationLines.map((line) => {
      const sourceNode = buildNodeSummary(line.from);
      const targetNode = buildNodeSummary(line.to);
      relatedNodes.set(sourceNode.id, sourceNode);
      relatedNodes.set(targetNode.id, targetNode);
      return [
        sourceNode.id,
        sourceNode.type,
        sourceNode.title,
        line.text,
        isDirectRelationLine(line.text) ? t("relationView.direct") : t("relationView.indirect"),
        targetNode.id,
        targetNode.type,
        targetNode.title,
        getRelationSourceFields(line).join(" | "),
      ];
    });

    const nodeRows = [...relatedNodes.values()]
      .sort((a, b) => (a.id === centerNode.id ? -1 : b.id === centerNode.id ? 1 : a.id.localeCompare(b.id)))
      .map((item) => [
        item.id,
        item.type,
        item.title,
        item.id === centerNode.id ? t("relationView.csvRoleRoot") : t("relationView.csvRoleRelated"),
        item.isSubNode ? t("relationView.csvYes") : t("relationView.csvNo"),
      ]);

    const csvSections = [
      t("relationView.csvNodes"),
      [
        t("relationView.csvHeaderId"),
        t("relationView.csvHeaderType"),
        t("relationView.csvHeaderTitle"),
        t("relationView.csvHeaderRole"),
        t("relationView.csvHeaderIsSubNode"),
      ].map(toCsvCell).join(","),
      ...nodeRows.map((row) => row.map(toCsvCell).join(",")),
      "",
      t("relationView.csvRelations"),
      [
        t("relationView.csvHeaderSourceId"),
        t("relationView.csvHeaderSourceType"),
        t("relationView.csvHeaderSourceTitle"),
        t("relationView.csvHeaderRelation"),
        t("relationView.csvHeaderDirectness"),
        t("relationView.csvHeaderTargetId"),
        t("relationView.csvHeaderTargetType"),
        t("relationView.csvHeaderTargetTitle"),
        t("relationView.csvHeaderSourceFields"),
      ].map(toCsvCell).join(","),
      ...relationRows.map((row) => row.map(toCsvCell).join(",")),
    ];

    try {
      await navigator.clipboard.writeText(csvSections.join("\n"));
      closeContextMenu();
      touchActionClose();
      ElMessage.success(t("relationView.copySuccess"));
    } catch {
      ElMessage.error(t("relationView.copyFailed"));
    }
  };

  const applyContextMenuPosition = (rawLeft: number, rawTop: number) => {
    const pane = networkPaneRef.value;
    if (!pane) return;

    const rect = pane.getBoundingClientRect();
    const maxLeft = Math.max(8, rect.width - contextMenuSize.width - 8);
    const maxTop = Math.max(8, rect.height - contextMenuSize.height - 8);

    dropdownStyle.left = `${Math.min(Math.max(8, rawLeft), maxLeft)}px`;
    dropdownStyle.top = `${Math.min(Math.max(8, rawTop), maxTop)}px`;
    dropdownStyle.visibility = "visible";
  };

  const openContextMenuAtPointer = (e: MouseEvent) => {
    const pane = networkPaneRef.value;
    if (!pane) return;

    const rect = pane.getBoundingClientRect();
    applyContextMenuPosition(e.clientX - rect.left + 12, e.clientY - rect.top + 16);
  };

  const handleGlobalPointerDown = (event: PointerEvent) => {
    if (dropdownStyle.visibility === "hidden") return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      closeContextMenu();
      return;
    }

    if (target.closest(".el-dropdown-menu") || target.closest(".el-popper")) return;
    closeContextMenu();
  };

  const setContextAvailability = (node: Node) => {
    switch (node.type) {
      case RelationType.risk: {
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      }
      case RelationType.avoidance: {
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = true;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      }
      case RelationType.attackTool: {
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      }
      case RelationType.threatActor: {
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = true;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      }
    }

    if (node.id == relKey.value) {
      disableContextMenuOpenAsRoot.value = true;
    }

    nodeType.value = node.type as RelationType;
    nodeId.value = node.id;
  };

  const nodeClick = (node: Node, e: MouseEvent) => {
    openContextMenuAtPointer(e);
    dropdown1.value?.handleOpen();
    setContextAvailability(node);
  };

  const openContextNodeDetailDrawer = () => {
    closeContextMenu();
    focusNodeInDrawer(nodeId.value);
  };

  const handleNodeTouch = (node: Node) => {
    setContextAvailability(node);
    touchActionVisible.value = true;
  };

  const clickContextMenu = (reqType: RelationType) => {
    genNetworkGraphData(reqType, nodeType.value, nodeId.value);
    touchActionVisible.value = false;
  };

  const gotoNewRelationView = () => {
    touchActionVisible.value = false;
    router.push({
      name: "relation",
      params: {
        type: nodeType.value,
        key: nodeId.value,
      },
    });
  };

  const gotoItemDetailView = () => {
    touchActionVisible.value = false;
    let routeName = "";
    switch (nodeType.value) {
      case RelationType.risk: {
        routeName = "riskDetail";
        router.push({
          name: routeName,
          params: {
            rKey: nodeId.value,
          },
        });
        return;
      }
      case RelationType.avoidance: {
        routeName = "avoidances";
        break;
      }
      case RelationType.attackTool: {
        routeName = "attackTools";
        break;
      }
      case RelationType.threatActor: {
        routeName = "threatActors";
        break;
      }
    }
    router.push({
      name: routeName,
      hash: `#${nodeId.value}`,
    });
  };

  const openTouchNodeDetailDrawer = () => {
    touchActionClose();
    focusNodeInDrawer(nodeId.value);
  };

  const openSelectedNodeAsRoot = () => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type) || node.id === relKey.value) return;
    router.push({
      name: "relation",
      params: {
        type: node.type,
        key: node.id,
      },
    });
  };

  const gotoSelectedNodeDetailView = () => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return;

    switch (node.type) {
      case RelationType.risk:
        router.push({
          name: "riskDetail",
          params: {
            rKey: node.id,
          },
        });
        return;
      case RelationType.avoidance:
        router.push({
          name: "avoidances",
          hash: `#${node.id}`,
        });
        return;
      case RelationType.attackTool:
        router.push({
          name: "attackTools",
          hash: `#${node.id}`,
        });
        return;
      case RelationType.threatActor:
        router.push({
          name: "threatActors",
          hash: `#${node.id}`,
        });
        return;
    }
  };

  const scrollDrawerToTop = () => {
    nextTick(() => {
      const drawerBody = document.querySelector(".relation-drawer .el-drawer__body");
      if (drawerBody instanceof HTMLElement) {
        drawerBody.scrollTop = 0;
      }
    });
  };

  const focusNodeInDrawer = (nodeId: string) => {
    if (!findNodeById(nodeId)) return;
    selectedNetworkNodeId.value = nodeId;
    nodeDetailDrawerVisible.value = true;
    scrollDrawerToTop();
  };

  const openNodeAsRootById = (nodeId: string) => {
    const node = findNodeById(nodeId);
    if (!node || !isRelationEntityType(node.type) || node.id === relKey.value) return;
    router.push({
      name: "relation",
      params: {
        type: node.type,
        key: node.id,
      },
    });
  };

  const isPathNodeCurrentSelection = (nodeId: string) => selectedNetworkNodeId.value === nodeId;

  const isRelationOnSelectedPath = (relationKey: string) => selectedNodePathRelationKeys.value.has(relationKey);

  const toggleNodeFilter = () => {
    nodeFilterVisible.value = !nodeFilterVisible.value;
  };

  const toggleLineFilter = () => {
    lineFilterVisible.value = !lineFilterVisible.value;
  };

  const openNodeDetailDrawer = () => {
    nodeDetailDrawerVisible.value = true;
  };

  const doFilter = () => {
    renderNetworkChart(true);
  };

  onMounted(() => {
    if (
      !Object.values(RelationType).includes(route.params.type as RelationType) ||
      !Object.keys(
        BREAK[
          RelationTypeMapping[
            route.params.type as keyof typeof RelationTypeMapping
          ].BreakKey as keyof typeof BREAK
        ]
      ).includes(route.params.key as string)
    ) {
      alert(t("unknownTypeOrId"));
      router
        .push({
          name: "relation",
          params: {
            type: "risk",
            key: "R0001",
          },
        })
        .then(() => {
          location.reload();
        });
      return;
    }
    addRootNode();
    genNetworkGraphData(RelationType.all, relType.value, relKey.value);
    nextTick(() => {
      renderNetworkChart(true);
      renderSankeyChart();
    });
    window.addEventListener("resize", resizeNetworkChart);
    window.addEventListener("resize", resizeSankeyChart);
    document.addEventListener("pointerdown", handleGlobalPointerDown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", resizeNetworkChart);
    window.removeEventListener("resize", resizeSankeyChart);
    document.removeEventListener("pointerdown", handleGlobalPointerDown);
    disposeNetworkChart();
    disposeSankeyChart();
  });

  watch(
    () => relType.value,
    () => {
      if (!Object.keys(getCurrentEntityOptions.value).includes(relKey.value)) {
        relKey.value = Object.keys(getCurrentEntityOptions.value)[0] ?? "";
      }
    }
  );

  watch(
    () => [relType.value, relKey.value],
    ([newType, newKey]) => {
      if (newType !== route.params.type || newKey !== route.params.key) {
        router.push({
          name: "relation",
          params: {
            type: newType,
            key: newKey,
          },
        });
      }
    }
  );

  watch(
    () => [route.params.type, route.params.key],
    () => {
      relType.value = route.params.type as RelationType;
      relKey.value = route.params.key as string;
      refreshGraphAfterVisible();
    }
  );

  watch(locale, () => {
    filterLineType.value = [];
    rebuildGraphData();
    nextTick(() => {
      renderNetworkChart(true);
      renderSankeyChart();
    });
  });

  watch(activeView, () => {
    if (activeView.value === "sankey") {
      nextTick(renderSankeyChart);
    } else {
      nextTick(() => renderNetworkChart(true));
    }
  });

  watch(
    sankeyData,
    () => {
      if (activeView.value === "sankey") {
        nextTick(renderSankeyChart);
      }
    },
    { deep: true }
  );

  watch(isDark, () => {
    renderNetworkChart(true);
    nextTick(renderSankeyChart);
  });

  watch(selectedNetworkNodeId, () => {
    if (activeView.value === "network") {
      nextTick(() => renderNetworkChart(true));
    }
  });

  return {
    RelationType,
    RelationTypeMapping,
    activeView,
    copyContextNodeCsv,
    disableContextMenuAll,
    disableContextMenuOpenAsRoot,
    doFilter,
    downloadNetworkChart,
    dropdown1,
    dropdownStyle,
    enterFullscreen,
    filterLineType,
    filterRelationType,
    filterSubNode,
    focusNodeInDrawer,
    formatRelationFieldsTooltip,
    getCurrentEntityOptions,
    getNodeTypeTitle,
    gotoItemDetailView,
    gotoNewRelationView,
    gotoSelectedNodeDetailView,
    handleNetworkLayoutCommand,
    isPathNodeCurrentSelection,
    isRelationOnSelectedPath,
    lineFilterVisible,
    networkChartRef,
    networkLayoutOptions,
    networkLayoutTooltip,
    networkPaneRef,
    networkState,
    nodeDetailDrawerVisible,
    nodeFilterVisible,
    openContextNodeDetailDrawer,
    openNodeAsRootById,
    openNodeDetailDrawer,
    openSelectedNodeAsRoot,
    openTouchNodeDetailDrawer,
    refreshNetworkChart,
    relKey,
    relationTypeItems,
    rootNodeRelations,
    sankeyChartRef,
    sankeyData,
    selectedNetworkNode,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathSummary,
    selectedNodeRootPath,
    selectedNodeRootPreview,
    subNodeFilterColor,
    toggleLineFilter,
    toggleNodeFilter,
    touchActionClose,
    touchActionVisible,
    visibleRelationLegendItems,
    clickContextMenu,
    relType,
    zoomNetworkChart,
  };
};
