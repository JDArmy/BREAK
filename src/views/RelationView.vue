<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import BREAK from "@/BREAK";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";
import { init, use, type ECharts } from "echarts/core";
import { SankeyChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import RelationGraph, {
  type RGJsonData,
  type RGLayoutOptions,
  type RGOptions,
} from "relation-graph/vue3";
import type { DropdownInstance } from "element-plus";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const { isDark } = useTheme();
use([SankeyChart, TooltipComponent, CanvasRenderer]);

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
const activeView = ref<"network" | "sankey">("network");

const graphRef$ = ref<RelationGraph>();
const sankeyChartRef = ref<HTMLDivElement>();
let sankeyChart: ECharts | null = null;

// 控制图谱组件的销毁与重建，用于主题切换时完整重绘 Canvas
const graphVisible = ref(true);

const graphOptions: RGOptions = reactive({
  allowShowMiniToolBar: true,
  disableZoom: false,
  disableDragCanvas: false,
  defaultExpandHolderPosition: "right",
  defaultShowLineLabel: true,
  defaultNodeWidth: 120,
  defaultNodeHeight: 120,
  moveToCenterWhenRefresh: true,
  zoomToFitWhenRefresh: true,
  backgroundColor: "transparent",
  defaultLineColor: "#999999",
  defaultLineFontColor: "#666666",
  defaultNodeFontColor: "#333333",
  defaultNodeBorderColor: "#efefef",
});

// 暗色模式下销毁并重建图谱，确保 Canvas 完整重绘
watch(isDark, (dark) => {
  graphOptions.backgroundColor = dark ? "#0f172a" : "#ffffff";
  graphOptions.defaultLineColor = dark ? "#475569" : "#999999";
  graphOptions.defaultLineFontColor = dark ? "#94a3b8" : "#666666";
  graphOptions.defaultNodeFontColor = dark ? "#e2e8f0" : "#333333";
  graphOptions.defaultNodeBorderColor = dark ? "#334155" : "#efefef";
  // 销毁图谱，等待 DOM 更新后重建
  graphVisible.value = false;
  nextTick(() => {
    graphVisible.value = true;
    nextTick(() => {
      rebuildGraphData();
      updateToolbarTitles();
    });
  });
}, { immediate: true });

graphOptions.layout = {
  layoutLabel: "中心布局",
  layoutName: "center",
  distance_coefficient: 2,
  maxLayoutTimes: 20,
  force_line_elastic: 0.3, // 连线牵引力系数
  force_node_repulsion: 3, // 节点排斥力系数
} as RGLayoutOptions;

// Reference: https://relation-graph.github.io/#/docs/node
interface Node {
  id: string;
  type: string;
  text: string;
  color: string;
  data?: { isSubNode?: boolean };
}

// Reference: https://relation-graph.github.io/#/docs/link
interface Line {
  from: string;
  text: string;
  to: string;
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
} as RGJsonData);

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
    },
    series: [
      {
        type: "sankey",
        data: sankeyData.value.nodes,
        links: sankeyData.value.links,
        left: 40,
        right: 280,
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
          width: 220,
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
    text: relKey.value + "<br>" + t(`BREAK.${RelationTypeMapping[relType.value as keyof typeof RelationTypeMapping].BreakKey}.${relKey.value}.title`),
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
      text: avoidanceKey + "<br>" + t(`BREAK.avoidances.${avoidanceKey}.title`),
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
      text: attackToolKey + "<br>" + t(`BREAK.attackTools.${attackToolKey}.title`),
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
      text: attackToolKey + "<br>" + t(`BREAK.attackTools.${attackToolKey}.title`),
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
      text: threatActorKey + "<br>" + t(`BREAK.threatActors.${threatActorKey}.title`),
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
      text: threatActorKey + "<br>" + t(`BREAK.threatActors.${threatActorKey}.title`),
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
      text: subriskKey + "<br>" + t(`BREAK.risks.${subriskKey}.title`),
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
      text: riskKey + "<br>" + t(`BREAK.risks.${riskKey}.title`),
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
      text: subavoidanceKey + "<br>" + t(`BREAK.avoidances.${subavoidanceKey}.title`),
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
      text: riskKey + "<br>" + t(`BREAK.risks.${riskKey}.title`),
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
      text: riskKey + "<br>" + t(`BREAK.risks.${riskKey}.title`),
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
      text: avoidanceKey + "<br>" + t(`BREAK.avoidances.${avoidanceKey}.title`),
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
      text: builderThreatActorKey + "<br>" + t(`BREAK.threatActors.${builderThreatActorKey}.title`),
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
      text: userThreatActorKey + "<br>" + t(`BREAK.threatActors.${userThreatActorKey}.title`),
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
        subattackToolKey + "<br>" + t(`BREAK.attackTools.${subattackToolKey}.title`),
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
      text: riskKey + "<br>" + t(`BREAK.risks.${riskKey}.title`),
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
      text: riskKey + "<br>" + t(`BREAK.risks.${riskKey}.title`),
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
      text: buildAttackToolKey + "<br>" + t(`BREAK.attackTools.${buildAttackToolKey}.title`),
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
      text: useAttackToolKey + "<br>" + t(`BREAK.attackTools.${useAttackToolKey}.title`),
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
        subthreatActorKey + "<br>" + t(`BREAK.threatActors.${subthreatActorKey}.title`),
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
// 删除lines中的重复数据
const uniqLines = () => {
  const linesSet = new Set();
  lines.forEach((line) => {
    linesSet.add(JSON.stringify(line));
  });
  lines.splice(0, lines.length);
  linesSet.forEach((line) => {
    lines.push(JSON.parse(line as string) as Line);
  });
};
// 设置关系图数据
const setRGJsonData = () => {
  uniqLines();
  graphRef$?.value?.setJsonData(jsonData);
  // graphRef$?.value?.setOptions(graphOptions);
  // 重新获取所有连线类型，服务于筛选功能
  getLineType();
};

function rebuildGraphData() {
  jsonData.rootId = relKey.value;
  nodes.splice(0, nodes.length);
  lines.splice(0, lines.length);
  addRootNode();
  genRGJsonData(RelationType.all, relType.value, relKey.value);
}

const refreshGraphAfterVisible = () => {
  rebuildGraphData();
  nextTick(() => {
    graphRef$.value?.getInstance().refresh(true);
    updateToolbarTitles();
  });
};

const genRGJsonData = (
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
  setRGJsonData();
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
  genRGJsonData(RelationType.all, relType.value, relKey.value);
  nextTick(() => updateToolbarTitles());
  window.addEventListener("resize", resizeSankeyChart);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeSankeyChart);
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
  updateToolbarTitles();
  nextTick(renderSankeyChart);
});

watch(activeView, () => {
  if (activeView.value === "sankey") {
    nextTick(renderSankeyChart);
  } else {
    nextTick(refreshGraphAfterVisible);
  }
});

watch(sankeyData, () => {
  if (activeView.value === "sankey") {
    nextTick(renderSankeyChart);
  }
}, { deep: true });

// 更新 relation-graph 工具栏按钮的 title（库硬编码中文，需手动替换）
const updateToolbarTitles = () => {
  const titleMap: Record<string, string> = {
    "全屏/退出全屏": t("toolbar.fullscreen"),
    "放大": t("toolbar.zoomIn"),
    "缩小": t("toolbar.zoomOut"),
    "点击停止自动布局": t("toolbar.stopAutoLayout"),
    "点击开始自动调整布局": t("toolbar.autoLayout"),
    "刷新": t("toolbar.refresh"),
    "下载图片": t("toolbar.download"),
  };
  document.querySelectorAll(".rel-toolbar .c-mb-button, .c-mini-toolbar .c-mb-button").forEach((el) => {
    const title = el.getAttribute("title");
    if (title && titleMap[title]) {
      el.setAttribute("title", titleMap[title]);
    }
  });
};

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

const clickContextMenu = (reqType: RelationType) => {
  genRGJsonData(reqType, nodeType.value, nodeId.value);
};

const gotoNewRelationView = () => {
  router.push({
    name: "relation",
    params: {
      type: nodeType.value,
      key: nodeId.value,
    },
  });
};

const gotoItemDetailView = () => {
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

const doFilter = () => {
  const _all_nodes = graphRef$.value?.getInstance().getNodes();
  const _all_links = graphRef$.value?.getInstance().getLinks();
  _all_nodes?.forEach((thisNode) => {
    const isSubNode = thisNode.data?.isSubNode;
    const _isHideThisNode =
      !filterRelationType.value.includes(thisNode.type as string) ||
      (isSubNode && !filterSubNode.value);
    thisNode.isHide = _isHideThisNode;
  });
  _all_links?.forEach((thisLink) => {
    thisLink.relations.forEach((thisLine) => {
      thisLine.isHide = !filterLineType.value.includes(thisLine.text as string);
    });
  });
  graphRef$.value?.getInstance().dataUpdated();
  graphRef$.value?.getInstance().refresh(true);
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
        <div class="relation-graph-pane">
          <relation-graph v-if="graphVisible" ref="graphRef$" :options="graphOptions">
            <template #node="{ node }">
              <div
                style="
                  cursor: pointer;
                  font-size: 16px;
                  display: flex;
                  height: inherit;
                  align-items: center;
                  justify-content: center;
                "
                @dblclick="nodeClick(node, $event)"
                @contextmenu="nodeClick(node, $event)"
                v-html="(node as Node).text"
              ></div>
            </template>
            <template #graph-plug>
              <div class="filter-pane" id="node-filter-pane">
                <h2>{{ $t('nodeFilter') }}</h2>
                <el-checkbox-group v-model="filterRelationType" @change="doFilter">
                  <el-checkbox
                    v-for="(item, key) in RelationTypeMapping"
                    :key="key"
                    :name="key"
                    class="filter-checkbox"
                    :value="key"
                    >{{ item.title }}</el-checkbox
                  >
                </el-checkbox-group>
                <el-checkbox v-model="filterSubNode" class="filter-checkbox" @change="doFilter">{{ $t('subNodeFilter') }}</el-checkbox>
              </div>
              <div class="filter-pane" id="line-filter-pane">
                <h2>{{ $t('lineFilter') }}</h2>
                <el-checkbox-group v-model="filterLineType" @change="doFilter">
                  <el-checkbox
                    class="filter-checkbox"
                    v-for="oneType in totalLineType"
                    :key="oneType"
                    :name="oneType"
                    :value="oneType"
                    >{{ oneType }}</el-checkbox
                  >
                </el-checkbox-group>
              </div>
            </template>
          </relation-graph>
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
  </div>
</template>

<style scoped>
.relation-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 132px);
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

.relation-graph-pane,
.sankey-pane {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  border: var(--break-graph-border) solid 1px;
  background: var(--break-card-bg);
}

.relation-graph-pane {
  overflow: hidden;
}

.sankey-pane {
  overflow-x: hidden;
  overflow-y: auto;
}

.sankey-chart {
  width: 100%;
  min-height: 100%;
}

@media (max-width: 760px) {
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

:deep(svg text) {
  font-size: 14px !important;
  fill: var(--break-graph-text) !important;
}
</style>

<style>
/* 暗色模式下图谱 Canvas 内节点文本颜色 */
html.dark .rel-node-text {
  color: #e2e8f0 !important;
}

html.dark .rel-node-detect {
  color: #e2e8f0 !important;
}

/* 暗色模式下工具栏背景和图标 */
html.dark .c-mini-toolbar {
  background-color: #1e293b !important;
  border-color: #334155 !important;
}

html.dark .c-mb-button {
  color: #cbd5e1 !important;
}

html.dark .c-current-zoom {
  color: #94a3b8 !important;
}

html.dark .rel-toolbar {
  background-color: #1e293b !important;
  border-color: #334155 !important;
}
</style>
