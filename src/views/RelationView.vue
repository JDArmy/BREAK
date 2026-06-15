<script setup lang="ts">
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
import { Aim, Download, FullScreen, InfoFilled, Refresh, ZoomIn, ZoomOut } from "@element-plus/icons-vue";
import type { DropdownInstance } from "element-plus";
import "element-plus/es/components/drawer/style/css";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const { isDark } = useTheme();
const { isMobile, width } = useBreakpoints();
use([GraphChart, SankeyChart, LegendComponent, TooltipComponent, CanvasRenderer]);

enum RelationType {
  risk = "risk",
  avoidance = "avoidance",
  attackTool = "attack-tool",
  threatActor = "threat-actor",
  all = "all",
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
let sankeyChart: ECharts | null = null;
let networkChart: ECharts | null = null;

type NetworkLayoutMode = "horizontal" | "lanes" | "split" | "radial";

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

const networkNodeSize = 58;
const networkRootNodeSize = 64;
const networkLabelMaxLineLength = 5;

const graphColors = {
  background: { light: "#ffffff", dark: "#0f172a" },
  line: { light: "#999999", dark: "#475569" },
  lineText: { light: "#666666", dark: "#94a3b8" },
  nodeText: { light: "#333333", dark: "#e2e8f0" },
  nodeBorder: { light: "#efefef", dark: "#334155" },
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

const getGraphColor = (key: keyof typeof graphColors) =>
  isDark.value ? graphColors[key].dark : graphColors[key].light;

const getRelationLineColor = (key: keyof typeof relationLineColors) =>
  isDark.value ? relationLineColors[key].dark : relationLineColors[key].light;

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

const nodes = reactive([] as Node[]);
const lines = reactive([] as Line[]);
const jsonData = reactive({
  rootId: relKey.value,
  nodes: nodes,
  lines: lines,
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

const isRelationEntityType = (type: string): type is Exclude<RelationType, RelationType.all> =>
  [RelationType.risk, RelationType.avoidance, RelationType.attackTool, RelationType.threatActor].includes(
    type as Exclude<RelationType, RelationType.all>
  );

const getNodeTypeTitle = (type: string) =>
  isRelationEntityType(type) ? RelationTypeMapping[type].title : type;

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
        relations: current.steps.map((step) => buildRelationSummary(step.line, step.fromId)),
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

const wrapLabelText = (text: string, maxLineLength = 10) => {
  const [id, title = ""] = text.replace(/<br\s*\/?>/gi, "\n").split("\n");
  if (!title) return id;

  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  if (words.length > 1) {
    let current = "";
    words.forEach((word) => {
      if (!current) {
        current = word;
      } else if (`${current} ${word}`.length <= maxLineLength) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
  } else {
    for (let index = 0; index < title.length; index += maxLineLength) {
      lines.push(title.slice(index, index + maxLineLength));
    }
  }

  return [id, ...lines.slice(0, 3)].join("\n");
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

/** Risk */
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

/** Avoidacne */
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
  // console.log(subavoidanceKeys);
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

/** AttackTool */
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

/** ThreatActor */
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
/**
 * 生成关系图数据
 */
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

const setNetworkGraphData = () => {
  uniqNodes();
  uniqLines();
  getLineType();
  renderNetworkChart();
};

function rebuildGraphData() {
  jsonData.rootId = relKey.value;
  selectedNetworkNodeId.value = relKey.value;
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

const findNodeById = (id: string) => nodes.find((node) => node.id === id);

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
  return {
    id: node.id,
    name: node.id,
    type: node.type,
    text,
    labelText: wrapLabelText(text, networkLabelMaxLineLength),
    symbolSize,
    itemStyle: {
      color: node.color,
      borderColor: getGraphColor("nodeBorder"),
      borderWidth: 1,
    },
    data: node.data,
    fixed: true,
    x,
    y,
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

const bindNetworkChartEvents = () => {
  if (!networkChart) return;
  networkChart.off("click");
  networkChart.off("dblclick");
  networkChart.off("contextmenu");
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
        draggable: false,
        focusNodeAdjacency: true,
        label: {
          show: true,
          color: getGraphColor("nodeText"),
          fontSize: 8,
          lineHeight: 10,
          width: 48,
          overflow: "break",
          formatter: (params: { data?: GraphNode }) => params.data?.labelText ?? "",
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
        zoom: networkState.zoom,
        scaleLimit: {
          min: 0.2,
          max: 3,
        },
      },
    ],
  } satisfies EChartsOption;

  networkChart.setOption(option, { notMerge, lazyUpdate: false });
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
  nodeType: RelationType,
  nodeId: string
) => {
  if (nodeType === RelationType.risk) {
    if (reqType == RelationType.avoidance) {
      addRiskAvoidance(nodeId);
    } else if (reqType == RelationType.attackTool) {
      addRiskAttackTool(nodeId);
    } else if (reqType == RelationType.threatActor) {
      addRiskThreatActor(nodeId);
    } else if (reqType == RelationType.all) {
      addRiskAvoidance(nodeId);
      addRiskAttackTool(nodeId);
      addRisk_AvoidanceAttackToolRelation(nodeId);
      addRiskThreatActor(nodeId);
      addRisk_ThreatActorAttackToolRelation(nodeId);
      addRiskSubrisk(nodeId);
    }
  } else if (nodeType === RelationType.avoidance) {
    if (reqType == RelationType.risk) {
      addAvoidanceRisk(nodeId);
    }
    if (reqType == RelationType.all) {
      addAvoidanceRisk(nodeId);
      addAvoidanceSubavoidance(nodeId);
    }
  } else if (nodeType === RelationType.attackTool) {
    if (reqType == RelationType.risk) {
      addAttackToolRisk(nodeId);
    } else if (reqType == RelationType.avoidance) {
      addAttackToolAvoidance(nodeId);
    } else if (reqType == RelationType.threatActor) {
      addAttackToolThreatActor(nodeId);
    } else if (reqType == RelationType.all) {
      addAttackToolRisk(nodeId);
      addAttackToolAvoidance(nodeId);
      addAttackTool_RiskAvoidanceRelation(nodeId);
      addAttackToolThreatActor(nodeId);
      addAttackTool_ThreatActorRiskRelation(nodeId);
      addAttackToolSubattackTool(nodeId);
    }
  } else if (nodeType === RelationType.threatActor) {
    if (reqType == RelationType.risk) {
      addThreatActorRisk(nodeId);
    } else if (reqType == RelationType.attackTool) {
      addThreatActorAttackTool(nodeId);
    } else if (reqType == RelationType.all) {
      addThreatActorRisk(nodeId);
      addThreatActorAttackTool(nodeId);
      addThreatActor_AttackToolRiskRelation(nodeId);
      addThreatActorSubthreatActor(nodeId);
    }
  }
  setNetworkGraphData();
};

/**
 * 初始化
 */
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
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeNetworkChart);
  window.removeEventListener("resize", resizeSankeyChart);
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

// 监听下拉框的值变化，改变路由
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

// 监听路由变化，改变关系图数据
watch(
  () => [route.params.type, route.params.key],
  () => {
    relType.value = route.params.type as RelationType;
    relKey.value = route.params.key as string;
    refreshGraphAfterVisible();
  }
);

// 监听语言切换，重新构建图数据（节点/连线文本需重新翻译）
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

watch(sankeyData, () => {
  if (activeView.value === "sankey") {
    nextTick(renderSankeyChart);
  }
}, { deep: true });

watch(isDark, () => {
  renderNetworkChart(true);
  nextTick(renderSankeyChart);
});

// 鼠标右键下拉菜单
const dropdownStyle = reactive({
  position: "absolute",
  zIndex: 65535,
  top: "0px",
  left: "0px",
  display: "none",
});
const dropdown1 = ref<DropdownInstance>();

const disableContextMenuAll = ref(false);
const disableContextMenuOpenAsRoot = ref(false);

// 当前右键的节点类型和id
const nodeType = ref("" as RelationType);
const nodeId = ref("" as string);

const nodeClick = (node: Node, e: MouseEvent) => {
  dropdownStyle.top = e.clientY + "px";
  dropdownStyle.left = e.clientX + "px";
  dropdownStyle.display = "block";
  dropdown1.value?.handleOpen();

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

// 触摸设备：底部操作面板
const touchActionVisible = ref(false);

const handleNodeTouch = (node: Node) => {
  // 与 nodeClick 相同的上下文菜单状态逻辑
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
  touchActionVisible.value = true;
};

const touchActionClose = () => {
  touchActionVisible.value = false;
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
    hash: "#" + nodeId.value,
  });
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
/**
 * 筛选
 */
const filterRelationType = ref([
  RelationType.risk,
  RelationType.avoidance,
  RelationType.attackTool,
  RelationType.threatActor,
] as string[]);

const filterSubNode = ref(true);

const totalLineType = ref([] as string[]);
const getLineType = () => {
  totalLineType.value.splice(0, totalLineType.value.length);
  lines.forEach((line) => {
    if (!totalLineType.value.includes(line.text)) {
      totalLineType.value.push(line.text);
    }
  });
  // 将新增的连线类型默认加入筛选（保持全选状态）
  totalLineType.value.forEach((lineType) => {
    if (!filterLineType.value.includes(lineType)) {
      filterLineType.value.push(lineType);
    }
  });
};
const filterLineType = ref(totalLineType.value);

const visibleRelationLegendItems = computed(() =>
  relationLegendItems.value.filter((item) => totalLineType.value.includes(item.label))
);

const nodeDetailDrawerVisible = ref(false);

const openNodeDetailDrawer = () => {
  nodeDetailDrawerVisible.value = true;
};

const doFilter = () => {
  renderNetworkChart(true);
};
</script>

<template>
  <div class="relation-page">
    <div class="relation-selector">
      <el-select class="relation-select" v-model="relType">
        <el-option
          v-for="(item, key) in RelationTypeMapping"
          :label="item.title"
          :key="key"
          :value="key"
        >
        </el-option>
      </el-select>
      <el-select class="relation-key-select" v-model="relKey" filterable>
        <el-option
          v-for="(_item, key) in getCurrentEntityOptions"
          :key="key"
          :label="key + ':' + $t(`BREAK.${RelationTypeMapping[relType as keyof typeof RelationTypeMapping].BreakKey}.${key}.title`)"
          :value="key"
        >
        </el-option>
      </el-select>
    </div>

    <el-tabs v-model="activeView" class="relation-tabs">
      <el-tab-pane :label="$t('relationView.network')" name="network">
        <!-- 关系图 -->
        <div class="network-graph-pane">
          <div class="graph-toolbar">
            <el-tooltip :content="$t('toolbar.fullscreen')" placement="top">
              <el-button circle size="small" @click="enterFullscreen">
                <el-icon><FullScreen /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.zoomIn')" placement="top">
              <el-button circle size="small" @click="zoomNetworkChart(0.08)">
                <el-icon><ZoomIn /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.zoomOut')" placement="top">
              <el-button circle size="small" @click="zoomNetworkChart(-0.08)">
                <el-icon><ZoomOut /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip
              :content="networkLayoutTooltip"
              placement="top"
            >
              <el-dropdown trigger="click" placement="left" @command="handleNetworkLayoutCommand">
                <el-button circle size="small">
                  <el-icon><Aim /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="layout in networkLayoutOptions"
                      :key="layout.value"
                      :command="layout.value"
                      :class="{ 'is-active-layout': layout.value === networkState.layout }"
                    >
                      {{ $t(layout.labelKey) }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.refresh')" placement="top">
              <el-button circle size="small" @click="refreshNetworkChart">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.download')" placement="top">
              <el-button circle size="small" @click="downloadNetworkChart">
                <el-icon><Download /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('relationView.nodeDetail')" placement="top">
              <el-button circle size="small" @click="openNodeDetailDrawer">
                <el-icon><InfoFilled /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
          <div ref="networkChartRef" class="network-chart"></div>
          <div class="filter-pane" id="node-filter-pane">
            <h2>{{ $t('nodeFilter') }}</h2>
            <el-checkbox-group v-model="filterRelationType" @change="doFilter">
              <el-checkbox
                v-for="(item, key) in RelationTypeMapping"
                :key="key"
                :name="key"
                class="filter-checkbox"
                :value="key"
              >
                <span class="filter-item-with-color">
                  <span class="legend-node-color" :style="{ backgroundColor: item.color }"></span>
                  <span>{{ item.title }}</span>
                </span>
              </el-checkbox
              >
            </el-checkbox-group>
            <el-checkbox v-model="filterSubNode" class="filter-checkbox" @change="doFilter">{{ $t('subNodeFilter') }}</el-checkbox>
          </div>
          <div class="filter-pane" id="line-filter-pane">
            <h2>{{ $t('lineFilter') }}</h2>
            <el-checkbox-group v-model="filterLineType" @change="doFilter">
              <el-checkbox
                class="filter-checkbox"
                v-for="item in visibleRelationLegendItems"
                :key="item.label"
                :name="item.label"
                :value="item.label"
              >
                <span class="filter-line-item">
                  <span class="legend-line-color" :style="{ backgroundColor: item.color }"></span>
                  <span class="filter-line-label">{{ item.label }}</span>
                  <el-tooltip :content="item.fields.join(', ')" placement="top">
                    <el-icon class="filter-line-help"><InfoFilled /></el-icon>
                  </el-tooltip>
                </span>
              </el-checkbox
              >
            </el-checkbox-group>
          </div>
          <el-dropdown ref="dropdown1" :handleOpen="true" :style="dropdownStyle">
            <span class="el-dropdown-link"></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="(item, key) in RelationTypeMapping"
                  :key="key"
                  @click="clickContextMenu(key)"
                  :disabled="item.disableContextMenu.value"
                  >{{ item.title }}</el-dropdown-item
                >
                <el-dropdown-item
                  @click="clickContextMenu(RelationType.all)"
                  :disabled="disableContextMenuAll"
                  >{{ $t('fetchAllRelations') }}</el-dropdown-item
                >
                <el-dropdown-item
                  @click="gotoNewRelationView()"
                  :disabled="disableContextMenuOpenAsRoot"
                  divided
                  >{{ $t('openAsRoot') }}</el-dropdown-item
                >
                <el-dropdown-item divided @click="gotoItemDetailView()"
                  >{{ $t('viewDetail') }}</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('relationView.attackPath')" name="sankey">
        <div class="sankey-pane">
          <div v-if="sankeyData.nodes.length === 0" class="sankey-empty">
            {{ $t("relationView.noAttackPath") }}
          </div>
          <div v-show="sankeyData.nodes.length > 0" ref="sankeyChartRef" class="sankey-chart"></div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 手机端触摸操作面板 -->
    <div v-if="touchActionVisible" class="touch-action-overlay" @click="touchActionClose">
      <div class="touch-action-sheet" @click.stop>
        <div class="touch-action-item"
          v-for="(item, key) in RelationTypeMapping"
          :key="key"
          :class="{ disabled: item.disableContextMenu.value }"
          @click="!item.disableContextMenu.value && clickContextMenu(key)"
        >{{ item.title }}</div>
        <div class="touch-action-item"
          :class="{ disabled: disableContextMenuAll }"
          @click="!disableContextMenuAll && clickContextMenu(RelationType.all)"
        >{{ $t('fetchAllRelations') }}</div>
        <div class="touch-action-divider"></div>
        <div class="touch-action-item"
          :class="{ disabled: disableContextMenuOpenAsRoot }"
          @click="!disableContextMenuOpenAsRoot && gotoNewRelationView()"
        >{{ $t('openAsRoot') }}</div>
        <div class="touch-action-item" @click="gotoItemDetailView()">{{ $t('viewDetail') }}</div>
        <div class="touch-action-divider"></div>
        <div class="touch-action-item touch-action-cancel" @click="touchActionClose">{{ $t('cancel') }}</div>
      </div>
    </div>

    <el-drawer
      v-model="nodeDetailDrawerVisible"
      :title="$t('relationView.nodeDetail')"
      direction="rtl"
      size="420px"
      append-to-body
      :z-index="4000"
      class="relation-drawer"
    >
      <div v-if="selectedNetworkNode" class="drawer-section">
        <div class="node-detail-title">
          <span class="node-detail-id">{{ selectedNetworkNode.id }}</span>
          <span class="node-detail-type">{{ getNodeTypeTitle(selectedNetworkNode.type) }}</span>
        </div>
        <div class="node-detail-name">{{ selectedNetworkNodeTitle }}</div>
        <div class="node-detail-counts">
          <span>{{ $t("relationView.incoming") }}: {{ selectedNetworkRelationCounts.incoming }}</span>
          <span>{{ $t("relationView.outgoing") }}: {{ selectedNetworkRelationCounts.outgoing }}</span>
        </div>
        <div class="node-detail-actions">
          <el-button size="small" @click="gotoSelectedNodeDetailView()">{{ $t("viewDetail") }}</el-button>
          <el-button
            size="small"
            :disabled="selectedNetworkNode.id === relKey"
            @click="openSelectedNodeAsRoot()"
          >
            {{ $t("openAsRoot") }}
          </el-button>
        </div>
        <div v-if="rootNodeRelations.length" class="node-explain-block">
          <h3>{{ $t("relationView.rootRelation") }}</h3>
          <div
            v-for="relation in rootNodeRelations"
            :key="`${relation.direction}-${relation.text}`"
            class="node-relation-item"
          >
            <div>
              <span class="node-relation-direction">{{ relation.direction }}</span>
              <span>{{ relation.text }}</span>
              <span class="node-relation-directness">{{ relation.directness }}</span>
            </div>
            <div v-if="relation.sourceFields.length" class="node-relation-fields">
              {{ $t("relationView.sourceFields") }}: {{ relation.sourceFields.join(", ") }}
            </div>
          </div>
        </div>
        <div v-else class="node-explain-block">
          <h3>{{ $t("relationView.rootRelation") }}</h3>
          <div class="node-relation-more">{{ $t("relationView.noDirectRootRelation") }}</div>
          <div v-if="selectedNodeRootPath" class="node-path-preview">
            <div class="node-path-summary">
              {{ $t("relationView.indirectPathSummary", { count: selectedNodeRootPath.hopCount }) }}
            </div>
            <div
              v-for="(relation, index) in selectedNodeRootPath.relations"
              :key="`${relation.direction}-${relation.text}-${relation.otherNodeId}-${index}`"
              class="node-relation-item"
            >
              <div>
                <span class="node-relation-direction">{{ index === 0 ? $t("relationView.rootStart") : relation.direction }}</span>
                <span>{{ relation.text }}</span>
                <span class="node-relation-directness">{{ relation.directness }}</span>
              </div>
              <div class="node-relation-target">
                {{ relation.otherNodeId }} {{ relation.otherNodeTitle }}
              </div>
              <div v-if="relation.sourceFields.length" class="node-relation-fields">
                {{ $t("relationView.sourceFields") }}: {{ relation.sourceFields.join(", ") }}
              </div>
            </div>
          </div>
        </div>
        <div v-if="selectedNodeAttackPathSummary.length" class="node-explain-block">
          <h3>{{ $t("relationView.attackPathRole") }}</h3>
          <div v-if="selectedNodeAttackPathDescription" class="node-relation-more">
            {{ selectedNodeAttackPathDescription }}
          </div>
          <div class="node-role-list">
            <span v-for="role in selectedNodeAttackPathSummary" :key="role" class="node-role-chip">{{ role }}</span>
          </div>
        </div>
        <div v-if="selectedNodeRootPreview" class="node-explain-block">
          <h3>{{ $t("relationView.rootPreview") }}</h3>
          <div class="node-detail-counts">
            <span>{{ $t("relationView.previewNodeCount") }}: {{ selectedNodeRootPreview.nodeCount }}</span>
            <span>{{ $t("relationView.previewRelationCount") }}: {{ selectedNodeRootPreview.lineCount }}</span>
          </div>
          <div class="node-preview-groups">
            <span
              v-for="(count, type) in selectedNodeRootPreview.groupedCounts"
              :key="type"
              class="node-role-chip"
            >
              {{ getNodeTypeTitle(type) }} {{ count }}
            </span>
          </div>
        </div>
        <div class="node-explain-block">
          <h3>{{ $t("relationView.allRelations") }}</h3>
        </div>
        <div class="node-relation-list">
          <div
            v-for="relation in selectedNetworkRelations"
            :key="`${relation.direction}-${relation.text}-${relation.otherNodeId}`"
            class="node-relation-item"
          >
            <div>
              <span class="node-relation-direction">{{ relation.direction }}</span>
              <span>{{ relation.text }}</span>
              <span class="node-relation-directness">{{ relation.directness }}</span>
            </div>
            <div class="node-relation-target">
              <span :title="relation.otherNodeType">{{ relation.otherNodeId }}</span>
              <span>{{ relation.otherNodeTitle }}</span>
            </div>
            <div v-if="relation.sourceFields.length" class="node-relation-fields">
              {{ $t("relationView.sourceFields") }}: {{ relation.sourceFields.join(", ") }}
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.relation-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 132px);
  min-height: 480px;
  overflow: hidden;
  padding: 0 12px 4px;
}

.relation-selector {
  position: absolute;
  z-index: 20;
  top: 0;
  right: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 4px;
}

.relation-select {
  width: 160px;
}

.relation-key-select {
  width: min(520px, calc(100vw - 420px));
}

.relation-tabs {
  min-height: 0;
  flex: 1;
}

.relation-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

.relation-tabs :deep(.el-tabs__nav-wrap) {
  padding-right: min(700px, calc(100vw - 360px));
}

.relation-tabs :deep(.el-tabs__nav-wrap) {
  min-height: 40px;
}

.relation-tabs :deep(.el-tabs__content) {
  height: calc(100% - 48px);
}

.relation-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.network-graph-pane,
.sankey-pane {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  border: var(--break-graph-border) solid 1px;
  background: var(--break-bg-card);
}

.network-graph-pane {
  overflow: hidden;
}

.network-chart {
  width: 100%;
  height: 100%;
}

.drawer-section {
  color: var(--break-text-primary);
}

.legend-node-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 10px;
  margin-bottom: 8px;
}

.legend-node-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.legend-node-color {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border: 1px solid var(--break-graph-border);
  border-radius: 50%;
}

.legend-relation-list,
.node-relation-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-relation-item,
.node-relation-item {
  padding-top: 6px;
  border-top: 1px solid var(--break-border);
  font-size: 12px;
  line-height: 1.4;
}

.legend-relation-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-line-color {
  width: 18px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.filter-item-with-color,
.filter-line-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.filter-line-item {
  flex-wrap: wrap;
}

.filter-line-label {
  font-weight: 600;
}

.filter-line-help {
  color: var(--break-text-muted);
  font-size: 12px;
}

.legend-relation-name,
.node-relation-direction {
  margin-right: 6px;
  font-weight: 700;
}

.legend-relation-fields,
.node-relation-fields,
.node-relation-target,
.node-relation-more {
  color: var(--break-text-muted);
  overflow-wrap: anywhere;
}

.node-path-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.node-path-summary {
  color: var(--break-text-secondary);
  font-size: 12px;
}

.relation-drawer :deep(.el-drawer) {
  z-index: 4000 !important;
}

.relation-drawer :deep(.el-overlay) {
  z-index: 4000 !important;
}

.relation-drawer :deep(.el-drawer__header) {
  margin-bottom: 8px;
}

.relation-drawer :deep(.el-drawer__body) {
  padding-top: 0;
  overflow-y: auto;
}

.node-detail-title,
.node-detail-counts,
.node-detail-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.node-detail-id {
  font-weight: 800;
}

.node-detail-type {
  padding: 2px 6px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
}

.node-detail-name {
  margin-bottom: 8px;
  color: var(--break-text-secondary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.node-detail-counts {
  color: var(--break-text-muted);
  font-size: 12px;
}

.node-explain-block {
  margin-top: 14px;
}

.node-explain-block h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
}

.node-relation-directness,
.node-role-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
}

.node-role-list,
.node-preview-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.node-relation-target {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.graph-toolbar {
  position: absolute;
  z-index: 710;
  top: 50%;
  right: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 48px;
  padding: 10px 7px;
  border: 1px solid var(--break-graph-border);
  border-radius: 8px;
  background: var(--break-bg-card);
  transform: translateY(-50%);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.graph-toolbar .el-button {
  width: 28px;
  height: 28px;
  margin-left: 0;
}

.graph-toolbar :deep(.el-button + .el-button) {
  margin-left: 0;
}

.graph-toolbar :deep(.el-dropdown) {
  line-height: 1;
}

.is-active-layout {
  color: var(--el-color-primary);
  font-weight: 600;
}

.sankey-pane {
  overflow-x: hidden;
  overflow-y: auto;
}

.sankey-chart {
  width: 100%;
  min-height: 100%;
}

@media (max-width: 767px) {
  .relation-selector {
    position: static;
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-bottom: 8px;
  }

  .relation-select,
  .relation-key-select {
    width: 100%;
  }

  .relation-tabs :deep(.el-tabs__header) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .relation-tabs :deep(.el-tabs__nav-wrap) {
    padding-right: 0;
  }

  .graph-toolbar {
    top: auto;
    right: 10px;
    bottom: 10px;
    flex-direction: row;
    flex-wrap: wrap;
    transform: none;
    max-width: calc(100% - 20px);
  }
}

.sankey-empty {
  display: flex;
  height: 100%;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  color: var(--break-graph-text);
  font-size: 14px;
}

.filter-pane {
  position: absolute;
  z-index: 700;
  top: 20px;
  padding: 10px 30px;
  border: var(--break-graph-border) solid 1px;
  color: var(--break-graph-text);
  border-radius: 10px;
  background-color: var(--break-graph-filter-bg);
}

.filter-checkbox {
  font-size: xx-small;
  display: block;
}

.filter-pane h2 {
  font-size: medium;
}

#node-filter-pane {
  left: 20px;
}
#line-filter-pane {
  right: 80px;
}

/* 触摸操作面板 */
.touch-action-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.touch-action-sheet {
  width: 100%;
  max-width: 500px;
  background: var(--break-bg-card);
  border-radius: 16px 16px 0 0;
  padding: 8px 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
}

.touch-action-item {
  padding: 14px 20px;
  font-size: 16px;
  color: var(--break-text-primary);
  cursor: pointer;
  text-align: center;
  transition: background-color 0.15s;
}

.touch-action-item:hover,
.touch-action-item:active {
  background: var(--break-bg-secondary);
}

.touch-action-item.disabled {
  color: var(--break-text-weak);
  cursor: not-allowed;
}

.touch-action-divider {
  height: 1px;
  background: var(--break-border);
  margin: 4px 20px;
}

.touch-action-cancel {
  font-weight: 600;
  color: var(--break-text-secondary);
}

@media (max-width: 767px) {
  .filter-pane {
    position: static;
    flex: 0 0 auto;
    margin: 0 8px 6px;
    padding: 8px 10px;
    max-height: 86px;
    overflow-y: auto;
    border-radius: 8px;
  }

  #node-filter-pane {
    order: 1;
    left: auto;
    right: auto;
  }

  #line-filter-pane {
    order: 2;
    left: auto;
    right: auto;
  }

  .network-graph-pane {
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
  }

  .network-chart {
    order: 3;
    flex: 1 1 auto;
    min-height: 260px;
    height: auto;
  }

  .legend-node-list {
    grid-template-columns: 1fr;
  }

  .filter-pane h2 {
    margin: 0 0 4px;
    font-size: 12px;
  }

  .filter-pane :deep(.el-checkbox-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
  }

  .filter-checkbox {
    display: inline-flex;
    margin-right: 0;
  }

  .filter-line-item {
    display: inline-flex;
    max-width: 100%;
  }
}
</style>
